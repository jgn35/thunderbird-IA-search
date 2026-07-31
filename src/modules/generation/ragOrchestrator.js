/**
 * Orchestrateur RAG pour l'extension Thunderbird
 * @module modules/generation/ragOrchestrator
 */

import { semanticSearchForRAG } from '../recherche/searchEngine.js';
import { callMistralAPI, generateResponseWithContext as generateWithMistral } from './apiClient.js';
import { callOllamaAPI, generateResponseWithContext as generateWithOllama } from './ollamaClient.js';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';
import { checkEmbeddingConfig } from '../indexation/indexer.js';

/**
 * Type de LLM
 * @typedef {'api_externe'|'local'} LLMType
 */

/**
 * Résultat du RAG
 * @typedef {Object} RAGResult
 * @property {boolean} success - Si le RAG a réussi
 * @property {string} question - La question originale
 * @property {string} answer - La réponse générée
 * @property {Array} context - Les extraits d'emails utilisés comme contexte
 * @property {string} llmType - Type de LLM utilisé
 * @property {string} model - Modèle utilisé
 * @property {number} duration - Durée de traitement (ms)
 * @property {string} [error] - Message d'erreur si applicable
 */

/**
 * Effectue une recherche RAG complète
 * @param {string} question - La question de l'utilisateur
 * @param {Object} [options] - Options supplémentaires
 * @param {number} [options.contextLimit=3] - Nombre d'emails à utiliser comme contexte
 * @param {LLMType} [options.llmType] - Type de LLM à utiliser (par défaut : configuration)
 * @returns {Promise<RAGResult>} Résultat du RAG
 */
export async function performRAG(question, options = {}) {
  const startTime = Date.now();
  const { contextLimit = 3, llmType: forcedLLMType = null } = options;

  try {
    // Récupérer la configuration
    const config = await getConfig();
    const llmType = forcedLLMType || config.rag?.type || 'api_externe';

    await logInfo(`Début du RAG pour la question : "${question}" (LLM: ${llmType})`);

    // Vérifier la configuration des embeddings
    const embeddingConfig = await checkEmbeddingConfig();
    
    if (!embeddingConfig.isValid) {
      await logWarn('Configuration des embeddings invalide. Utilisation de la recherche par mots-clés.');
    }

    // Étape 1 : Recherche vectorielle (Retrieval)
    const searchResult = await semanticSearchForRAG(question, contextLimit);
    
    if (!searchResult.success || searchResult.results.length === 0) {
      await logWarn(`Aucun résultat trouvé pour la question : "${question}"`);
      
      // Si aucun contexte trouvé, essayer de générer une réponse sans contexte
      const answer = await generateAnswerWithoutContext(question, llmType);
      
      return {
        success: answer.success,
        question,
        answer: answer.text || "Je n'ai pas trouvé d'informations pertinentes dans vos emails.",
        context: [],
        llmType,
        model: answer.model || '',
        duration: Date.now() - startTime,
        error: searchResult.error,
      };
    }

    // Extraire le contexte des résultats de recherche
    const context = searchResult.results.map(result => ({
      emailId: result.emailId,
      subject: result.subject,
      body: result.body,
      from: result.from,
      to: result.to,
      date: result.date,
      folderName: result.folderName,
      score: result.score,
    }));

    // Formater le contexte pour le LLM
    const formattedContext = formatContextForLLM(context);

    await logInfo(`Contexte récupéré : ${context.length} emails pertinents`);

    // Étape 2 : Génération (Generation)
    let ragResult;
    
    if (llmType === 'local') {
      ragResult = await generateWithOllama(formattedContext, question);
    } else {
      ragResult = await generateWithMistral(formattedContext, question);
    }

    if (!ragResult.success) {
      await logError(new Error(ragResult.error), 'Génération RAG');
      return {
        success: false,
        question,
        answer: '',
        context,
        llmType,
        model: '',
        duration: Date.now() - startTime,
        error: ragResult.error,
      };
    }

    await logInfo(`RAG terminé avec succès pour : "${question}"`);

    return {
      success: true,
      question,
      answer: ragResult.text,
      context,
      llmType,
      model: ragResult.model,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    await logError(error, 'Orchestration RAG');
    return {
      success: false,
      question,
      answer: '',
      context: [],
      llmType: llmType || 'api_externe',
      model: '',
      duration: Date.now() - startTime,
      error: error.message || 'Une erreur est survenue lors du RAG.',
    };
  }
}

/**
 * Formate le contexte pour le LLM
 * @param {Array} context - Liste des extraits d'emails
 * @returns {string} Le contexte formaté
 */
function formatContextForLLM(context) {
  if (!context || context.length === 0) {
    return '';
  }

  const formattedParts = context.map((item, index) => {
    const date = new Date(item.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return `[Email ${index + 1} - ${item.folderName} - ${date}]
Expéditeur : ${item.from}
Destinataire : ${item.to}
Sujet : ${item.subject}
Contenu : ${item.body}
`;
  });

  return formattedParts.join('\n---\n');
}

/**
 * Génère une réponse sans contexte (si aucun email pertinent trouvé)
 * @param {string} question - La question de l'utilisateur
 * @param {LLMType} llmType - Type de LLM à utiliser
 * @returns {Promise<Object>} Résultat de la génération
 */
async function generateAnswerWithoutContext(question, llmType) {
  try {
    const prompt = `Réponds à la question suivante de manière générale, sans contexte spécifique :

Question : ${question}

Réponse :`;

    if (llmType === 'local') {
      return await callOllamaAPI(prompt);
    } else {
      return await callMistralAPI(prompt);
    }
  } catch (error) {
    await logError(error, 'Génération sans contexte');
    return {
      success: false,
      text: "Je n'ai pas trouvé d'informations pertinentes dans vos emails.",
      model: '',
    };
  }
}

/**
 * Résume une conversation email
 * @param {string[]} emailIds - Liste des IDs des emails de la conversation
 * @param {Object} [options] - Options supplémentaires
 * @param {LLMType} [options.llmType] - Type de LLM à utiliser
 * @returns {Promise<RAGResult>} Résultat du résumé
 */
export async function summarizeConversation(emailIds, options = {}) {
  const startTime = Date.now();
  const { llmType: forcedLLMType = null } = options;

  try {
    const config = await getConfig();
    const llmType = forcedLLMType || config.rag?.type || 'api_externe';

    await logInfo(`Résumé de conversation pour ${emailIds.length} emails`);

    // Récupérer les emails de la conversation
    const emails = [];
    for (const emailId of emailIds) {
      try {
        // Utiliser l'API messenger directement (disponible dans background)
        // Si appelé depuis UI, cela nécessiterait browser.runtime.sendMessage
        // Pour l'instant, on utilise directement l'API
        const messengerAPI = typeof messenger !== 'undefined' ? messenger : (typeof browser !== 'undefined' ? browser.messenger : null);
        if (messengerAPI) {
          const email = await messengerAPI.messages.getFull(emailId);
          if (email) {
            emails.push(email);
          }
        } else {
          await logWarn(`API messenger non disponible pour récupérer l'email ${emailId}`);
        }
      } catch (error) {
        await logError(error, `Récupération de l'email ${emailId}`);
      }
    }

    if (emails.length === 0) {
      return {
        success: false,
        question: `Résumé de la conversation (${emailIds.length} emails)`,
        answer: '',
        context: [],
        llmType,
        model: '',
        duration: Date.now() - startTime,
        error: 'Aucun email trouvé pour cette conversation.',
      };
    }

    // Formater la conversation pour le LLM
    const formattedConversation = formatConversationForLLM(emails);

    // Générer le résumé
    let result;
    if (llmType === 'local') {
      result = await callOllamaAPI(`Résumé la conversation suivante en 5 à 10 phrases :\n\n${formattedConversation}\n\nRésumé :`);
    } else {
      result = await callMistralAPI(`Résumé la conversation suivante en 5 à 10 phrases :\n\n${formattedConversation}\n\nRésumé :`);
    }

    if (!result.success) {
      return {
        success: false,
        question: `Résumé de la conversation (${emailIds.length} emails)`,
        answer: '',
        context: emails.map(e => ({ emailId: e.id, subject: e.subject })),
        llmType,
        model: '',
        duration: Date.now() - startTime,
        error: result.error,
      };
    }

    return {
      success: true,
      question: `Résumé de la conversation (${emailIds.length} emails)`,
      answer: result.text,
      context: emails.map(e => ({ emailId: e.id, subject: e.subject })),
      llmType,
      model: result.model,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    await logError(error, 'Résumé de conversation');
    return {
      success: false,
      question: `Résumé de la conversation (${emailIds.length} emails)`,
      answer: '',
      context: [],
      llmType: llmType || 'api_externe',
      model: '',
      duration: Date.now() - startTime,
      error: error.message || 'Erreur lors du résumé de la conversation.',
    };
  }
}

/**
 * Formate une conversation pour le LLM
 * @param {Array} emails - Liste des emails de la conversation
 * @returns {string} La conversation formatée
 */
function formatConversationForLLM(emails) {
  // Trier les emails par date
  const sortedEmails = [...emails].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  const formattedParts = sortedEmails.map((email, index) => {
    const date = new Date(email.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `[Message ${index + 1} - ${date}]
De : ${email.from?.value || 'Inconnu'}
À : ${email.to?.value || 'Inconnu'}
Sujet : ${email.subject || 'Sans sujet'}
Contenu : ${email.body || ''}
`;
  });

  return formattedParts.join('\n---\n');
}

/**
 * Vérifie la configuration du RAG
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkRAGConfig() {
  try {
    const config = await getConfig();
    const { type: llmType = 'api_externe' } = config.rag || {};

    if (llmType === 'local') {
      // Vérifier la configuration Ollama
      const ollamaConfig = config.rag?.local || {};
      const isValid = ollamaConfig.url && ollamaConfig.url.trim() !== '' &&
        ollamaConfig.model && ollamaConfig.model.trim() !== '';

      return {
        isValid,
        llmType,
        error: isValid ? null : 'Configuration Ollama incomplète.',
        details: {
          url: ollamaConfig.url || '',
          model: ollamaConfig.model || '',
        },
      };
    } else {
      // Vérifier la configuration API (Mistral)
      const apiConfig = config.rag?.api || {};
      const isValid = apiConfig.endpoint && apiConfig.endpoint.trim() !== '' &&
        apiConfig.apiKey && apiConfig.apiKey.trim() !== '';

      return {
        isValid,
        llmType,
        error: isValid ? null : 'Configuration API Mistral incomplète.',
        details: {
          endpoint: apiConfig.endpoint || '',
          hasApiKey: !!apiConfig.apiKey,
        },
      };
    }
  } catch (error) {
    await logError(error, 'Vérification de la configuration RAG');
    return {
      isValid: false,
      llmType: 'api_externe',
      error: error.message || 'Erreur lors de la vérification.',
    };
  }
}

/**
 * Récupère le type de LLM actuel
 * @returns {Promise<LLMType>} Type de LLM
 */
export async function getCurrentLLMType() {
  try {
    const config = await getConfig();
    return config.rag?.type || 'api_externe';
  } catch (error) {
    await logError(error, 'Récupération du type de LLM');
    return 'api_externe';
  }
}

/**
 * Change le type de LLM
 * @param {LLMType} llmType - Nouveau type de LLM
 * @returns {Promise<Object>} Résultat du changement
 */
export async function setLLMType(llmType) {
  try {
    if (llmType !== 'api_externe' && llmType !== 'local') {
      return {
        success: false,
        error: 'Type de LLM invalide. Utilisez "api_externe" ou "local".',
      };
    }

    const config = await getConfig();
    await browser.storage.local.set({
      rag: {
        ...config.rag,
        type: llmType,
      },
    });

    await logInfo(`Type de LLM changé : ${llmType}`);
    return {
      success: true,
      llmType,
    };
  } catch (error) {
    await logError(error, 'Changement du type de LLM');
    return {
      success: false,
      error: error.message || 'Erreur lors du changement du type de LLM.',
    };
  }
}
