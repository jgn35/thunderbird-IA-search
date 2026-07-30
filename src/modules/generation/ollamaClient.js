/**
 * Client pour Ollama (LLM local)
 * @module modules/generation/ollamaClient
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Timeout par défaut pour les requêtes Ollama (en ms)
 * @type {number}
 */
const DEFAULT_TIMEOUT = 120000; // 2 minutes (Ollama peut être lent)

/**
 * Configuration par défaut pour Ollama
 * @type {Object}
 */
const DEFAULT_OLLAMA_CONFIG = {
  url: 'http://localhost:11434',
  model: 'mistral-7b',
  temperature: 0.7,
  maxTokens: 512,
};

/**
 * Vérifie si la configuration Ollama est valide
 * @param {Object} config - Configuration Ollama
 * @returns {boolean} Vrai si la configuration est valide
 */
function isOllamaConfigValid(config) {
  return config && 
    config.url && 
    config.url.trim() !== '' &&
    config.model && 
    config.model.trim() !== '';
}

/**
 * Effectue une requête HTTP avec timeout
 * @param {string} url - URL de la requête
 * @param {Object} options - Options de la requête
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<Response>} Réponse HTTP
 */
async function fetchWithTimeout(url, options, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Appelle l'API Ollama pour générer du texte
 * @param {string} prompt - Le prompt à envoyer
 * @param {Object} [options] - Options supplémentaires
 * @param {string} [options.model] - Modèle à utiliser
 * @param {number} [options.temperature] - Température pour la génération
 * @param {number} [options.maxTokens] - Nombre maximal de tokens
 * @param {Object} [options.config] - Configuration Ollama personnalisée
 * @returns {Promise<Object>} Réponse de l'API
 */
export async function callOllamaAPI(prompt, options = {}) {
  try {
    const {
      model = DEFAULT_OLLAMA_CONFIG.model,
      temperature = DEFAULT_OLLAMA_CONFIG.temperature,
      maxTokens = DEFAULT_OLLAMA_CONFIG.maxTokens,
      config: customConfig = null,
    } = options;

    // Récupérer la configuration
    const currentConfig = customConfig || await getConfig();
    const ollamaConfig = currentConfig.rag?.local || {};

    // Vérifier la configuration
    if (!isOllamaConfigValid(ollamaConfig)) {
      await logError(new Error('Configuration Ollama invalide'), 'Appel API Ollama');
      return {
        success: false,
        error: 'Configuration Ollama invalide. Veuillez configurer l\'URL et le modèle.',
      };
    }

    const url = ollamaConfig.url.endsWith('/') 
      ? ollamaConfig.url.slice(0, -1) 
      : ollamaConfig.url;
    const modelName = ollamaConfig.model || model;

    // Construire le payload
    const payload = {
      model: modelName,
      prompt,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    await logInfo(`Appel API Ollama : url=${url}, model=${modelName}`);

    // Effectuer la requête avec fetch
    const response = await fetchWithTimeout(
      `${url}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    // Traiter la réponse
    const responseData = await response.json();
    
    if (!response.ok) {
      let errorMessage = 'Erreur API Ollama';
      if (responseData && responseData.error) {
        errorMessage = responseData.error;
      }
      
      const status = response.status;
      if (status === 404) {
        errorMessage = 'Modèle introuvable. Vérifiez le nom du modèle.';
      } else if (status === 500) {
        errorMessage = 'Erreur serveur Ollama. Vérifiez que Ollama est en cours d\'exécution.';
      }
      
      await logError(new Error(errorMessage), 'Appel API Ollama');
      return {
        success: false,
        error: errorMessage,
        status,
      };
    }

    if (responseData && responseData.response) {
      const generatedText = responseData.response;

      await logInfo('Réponse API Ollama reçue avec succès');

      return {
        success: true,
        text: generatedText,
        model: responseData.model,
        done: responseData.done,
        totalDuration: responseData.total_duration,
        loadDuration: responseData.load_duration,
        promptEvalCount: responseData.prompt_eval_count,
        evalCount: responseData.eval_count,
      };
    }

    await logWarn('Réponse API Ollama invalide', responseData);
    return {
      success: false,
      error: 'Réponse API invalide.',
      response: responseData,
    };
  } catch (error) {
    await logError(error, 'Appel API Ollama');
    
    let errorMessage = 'Une erreur est survenue lors de l\'appel à Ollama.';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout : La requête a pris trop de temps. Ollama peut être lent à démarrer.';
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('connection refused')) {
      errorMessage = 'Impossible de se connecter à Ollama. Vérifiez que le serveur est en cours d\'exécution.';
    } else if (error.code === 'ENOTFOUND' || error.message?.includes('Failed to fetch')) {
      errorMessage = 'URL Ollama introuvable. Vérifiez l\'adresse.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Génère une réponse basée sur un contexte (pour le RAG)
 * @param {string} context - Le contexte (extraits d'emails)
 * @param {string} question - La question de l'utilisateur
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<Object>} Réponse générée
 */
export async function generateResponseWithContext(context, question, options = {}) {
  try {
    // Construire le prompt pour le RAG
    const prompt = buildRAGPrompt(context, question);
    
    // Appeler l'API Ollama
    const result = await callOllamaAPI(prompt, options);
    
    if (!result.success) {
      return result;
    }

    return {
      ...result,
      context,
      question,
    };
  } catch (error) {
    await logError(error, 'Génération de réponse avec contexte (Ollama)');
    return {
      success: false,
      error: error.message || 'Erreur lors de la génération de la réponse.',
    };
  }
}

/**
 * Construit un prompt pour le RAG
 * @param {string} context - Le contexte (extraits d'emails)
 * @param {string} question - La question de l'utilisateur
 * @returns {string} Le prompt formaté
 */
export function buildRAGPrompt(context, question) {
  return `You are a helpful assistant that answers questions based only on the provided context.

Context:
${context}

Question: ${question}

Instructions:
- Answer only using the information from the context.
- If the answer is not in the context, say "I could not find relevant information in the emails."
- Respond in French if the question is in French, in English if the question is in English.
- Be concise and accurate.

Answer:`;
}

/**
 * Résume un texte en utilisant Ollama
 * @param {string} text - Le texte à résumer
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<Object>} Résumé généré
 */
export async function summarizeText(text, options = {}) {
  try {
    const prompt = `Summarize the following text in 3 to 5 sentences:

${text}

Summary:`;

    const result = await callOllamaAPI(prompt, {
      ...options,
      maxTokens: 256,
      temperature: 0.3,
    });

    return result;
  } catch (error) {
    await logError(error, 'Résumé de texte (Ollama)');
    return {
      success: false,
      error: error.message || 'Erreur lors du résumé du texte.',
    };
  }
}

/**
 * Vérifie la configuration Ollama
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkOllamaConfig() {
  try {
    const config = await getConfig();
    const ollamaConfig = config.rag?.local || {};

    if (!isOllamaConfigValid(ollamaConfig)) {
      return {
        isValid: false,
        error: 'Configuration Ollama invalide.',
        missing: [],
      };
    }

    const missing = [];
    if (!ollamaConfig.url || ollamaConfig.url.trim() === '') {
      missing.push('url');
    }
    if (!ollamaConfig.model || ollamaConfig.model.trim() === '') {
      missing.push('model');
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        error: 'Configuration Ollama incomplète.',
        missing,
      };
    }

    return {
      isValid: true,
      url: ollamaConfig.url,
      model: ollamaConfig.model,
    };
  } catch (error) {
    await logError(error, 'Vérification de la configuration Ollama');
    return {
      isValid: false,
      error: error.message || 'Erreur lors de la vérification.',
    };
  }
}

/**
 * Vérifie si Ollama est en cours d'exécution
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkOllamaStatus() {
  try {
    const config = await getConfig();
    const ollamaConfig = config.rag?.local || {};

    if (!isOllamaConfigValid(ollamaConfig)) {
      return {
        isRunning: false,
        error: 'Configuration Ollama invalide.',
      };
    }

    const url = ollamaConfig.url.endsWith('/') 
      ? ollamaConfig.url.slice(0, -1) 
      : ollamaConfig.url;

    try {
      // Essayer de lister les modèles (endpoint simple pour vérifier si Ollama répond)
      const response = await fetchWithTimeout(
        `${url}/api/tags`,
        {
          method: 'GET',
        },
        5000 // Timeout court pour la vérification
      );

      if (response.ok) {
        const responseData = await response.json();
        if (responseData && responseData.models) {
          return {
            isRunning: true,
            models: responseData.models,
          };
        }

        return {
          isRunning: true,
          models: [],
        };
      }

      return {
        isRunning: false,
        error: `Erreur ${response.status} : Impossible de se connecter à Ollama.`,
      };
    } catch (error) {
      return {
        isRunning: false,
        error: 'Impossible de se connecter à Ollama.',
      };
    }
  } catch (error) {
    await logError(error, 'Vérification du statut Ollama');
    return {
      isRunning: false,
      error: error.message || 'Erreur lors de la vérification.',
    };
  }
}

/**
 * Récupère les modèles disponibles sur Ollama
 * @returns {Promise<Array>} Liste des modèles disponibles
 */
export async function getAvailableModels() {
  try {
    const config = await getConfig();
    const ollamaConfig = config.rag?.local || {};

    if (!isOllamaConfigValid(ollamaConfig)) {
      return [];
    }

    const url = ollamaConfig.url.endsWith('/') 
      ? ollamaConfig.url.slice(0, -1) 
      : ollamaConfig.url;

    const response = await fetchWithTimeout(
      `${url}/api/tags`,
      {
        method: 'GET',
      },
      10000
    );

    if (!response.ok) {
      await logError(new Error(`Erreur ${response.status}`), 'Récupération des modèles Ollama');
      return [];
    }

    const responseData = await response.json();
    
    if (responseData && responseData.models) {
      return responseData.models.map(model => model.name);
    }

    return [];
  } catch (error) {
    await logError(error, 'Récupération des modèles Ollama');
    return [];
  }
}
