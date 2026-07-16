/**
 * Client API pour Mistral AI
 * @module modules/generation/apiClient
 */

import axios from 'axios';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Timeout par défaut pour les requêtes API (en ms)
 * @type {number}
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Configuration par défaut pour l'API Mistral
 * @type {Object}
 */
const DEFAULT_API_CONFIG = {
  endpoint: 'https://api.mistral.ai/v1',
  model: 'mistral-tiny',
  temperature: 0.7,
  maxTokens: 512,
};

/**
 * En-têtes par défaut pour les requêtes API
 * @param {string} apiKey - Clé API
 * @returns {Object} En-têtes HTTP
 */
function getDefaultHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
}

/**
 * Vérifie si la configuration API est valide
 * @param {Object} config - Configuration API
 * @returns {boolean} Vrai si la configuration est valide
 */
function isApiConfigValid(config) {
  return config && 
    config.endpoint && 
    config.endpoint.trim() !== '' &&
    config.apiKey && 
    config.apiKey.trim() !== '';
}

/**
 * Appelle l'API Mistral pour générer du texte
 * @param {string} prompt - Le prompt à envoyer
 * @param {Object} [options] - Options supplémentaires
 * @param {string} [options.model] - Modèle à utiliser
 * @param {number} [options.temperature] - Température pour la génération
 * @param {number} [options.maxTokens] - Nombre maximal de tokens
 * @param {Object} [options.config] - Configuration API personnalisée
 * @returns {Promise<Object>} Réponse de l'API
 */
export async function callMistralAPI(prompt, options = {}) {
  try {
    const {
      model = DEFAULT_API_CONFIG.model,
      temperature = DEFAULT_API_CONFIG.temperature,
      maxTokens = DEFAULT_API_CONFIG.maxTokens,
      config: customConfig = null,
    } = options;

    // Récupérer la configuration
    const currentConfig = customConfig || await getConfig();
    const apiConfig = currentConfig.rag?.api || {};

    // Vérifier la configuration
    if (!isApiConfigValid(apiConfig)) {
      await logError(new Error('Configuration API Mistral invalide'), 'Appel API Mistral');
      return {
        success: false,
        error: 'Configuration API invalide. Veuillez configurer votre clé API et endpoint.',
      };
    }

    const endpoint = apiConfig.endpoint.endsWith('/') 
      ? apiConfig.endpoint.slice(0, -1) 
      : apiConfig.endpoint;
    const apiKey = apiConfig.apiKey;

    // Construire le payload
    const payload = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    await logInfo(`Appel API Mistral : endpoint=${endpoint}, model=${model}`);

    // Effectuer la requête
    const response = await axios.post(
      `${endpoint}/chat/completions`,
      payload,
      {
        headers: getDefaultHeaders(apiKey),
        timeout: DEFAULT_TIMEOUT,
      }
    );

    // Traiter la réponse
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const choice = response.data.choices[0];
      const generatedText = choice.message?.content || '';

      await logInfo('Réponse API Mistral reçue avec succès');

      return {
        success: true,
        text: generatedText,
        model: response.data.model,
        usage: response.data.usage,
      };
    }

    await logWarn('Réponse API Mistral invalide', response.data);
    return {
      success: false,
      error: 'Réponse API invalide.',
      response: response.data,
    };
  } catch (error) {
    await logError(error, 'Appel API Mistral');
    
    let errorMessage = 'Une erreur est survenue lors de l\'appel à l\'API Mistral.';
    
    if (error.response) {
      // Erreur avec réponse du serveur
      const status = error.response.status;
      const data = error.response.data;
      
      errorMessage = `Erreur API Mistral (${status}): ${data.message || JSON.stringify(data)}`;
      
      if (status === 401) {
        errorMessage = 'Clé API invalide. Veuillez vérifier votre configuration.';
      } else if (status === 404) {
        errorMessage = 'Endpoint API introuvable. Veuillez vérifier l\'URL.';
      } else if (status >= 500) {
        errorMessage = 'Erreur serveur chez Mistral AI. Veuillez réessayer plus tard.';
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Timeout : La requête a pris trop de temps. Veuillez réessayer.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Impossible de se connecter à l\'API. Vérifiez votre connexion internet.';
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
    
    // Appeler l'API Mistral
    const result = await callMistralAPI(prompt, options);
    
    if (!result.success) {
      return result;
    }

    return {
      ...result,
      context,
      question,
    };
  } catch (error) {
    await logError(error, 'Génération de réponse avec contexte');
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
  return `Tu es un assistant utile qui répond aux questions en se basant uniquement sur le contexte fourni.

Contexte :
${context}

Question : ${question}

Instructions :
- Réponds uniquement en utilisant les informations du contexte.
- Si la réponse n'est pas dans le contexte, dis "Je n'ai pas trouvé d'information pertinente dans les emails."
- Réponds en français si la question est en français, en anglais si la question est en anglais.
- Sois concis et précis.

Réponse :`;
}

/**
 * Résume un texte en utilisant l'API Mistral
 * @param {string} text - Le texte à résumer
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<Object>} Résumé généré
 */
export async function summarizeText(text, options = {}) {
  try {
    const prompt = `Résumé le texte suivant en 3 à 5 phrases :

${text}

Résumé :`;

    const result = await callMistralAPI(prompt, {
      ...options,
      maxTokens: 256,
      temperature: 0.3,
    });

    return result;
  } catch (error) {
    await logError(error, 'Résumé de texte');
    return {
      success: false,
      error: error.message || 'Erreur lors du résumé du texte.',
    };
  }
}

/**
 * Vérifie la configuration API
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkApiConfig() {
  try {
    const config = await getConfig();
    const apiConfig = config.rag?.api || {};

    if (!isApiConfigValid(apiConfig)) {
      return {
        isValid: false,
        error: 'Configuration API invalide.',
        missing: [],
      };
    }

    const missing = [];
    if (!apiConfig.endpoint || apiConfig.endpoint.trim() === '') {
      missing.push('endpoint');
    }
    if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') {
      missing.push('apiKey');
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        error: 'Configuration API incomplète.',
        missing,
      };
    }

    return {
      isValid: true,
      endpoint: apiConfig.endpoint,
      model: apiConfig.model || DEFAULT_API_CONFIG.model,
    };
  } catch (error) {
    await logError(error, 'Vérification de la configuration API');
    return {
      isValid: false,
      error: error.message || 'Erreur lors de la vérification.',
    };
  }
}

/**
 * Récupère les modèles disponibles sur Mistral AI
 * @returns {Promise<Array>} Liste des modèles disponibles
 */
export async function getAvailableModels() {
  try {
    const config = await getConfig();
    const apiConfig = config.rag?.api || {};

    if (!isApiConfigValid(apiConfig)) {
      return [];
    }

    const endpoint = apiConfig.endpoint.endsWith('/') 
      ? apiConfig.endpoint.slice(0, -1) 
      : apiConfig.endpoint;
    const apiKey = apiConfig.apiKey;

    const response = await axios.get(
      `${endpoint}/models`,
      {
        headers: getDefaultHeaders(apiKey),
        timeout: DEFAULT_TIMEOUT,
      }
    );

    if (response.data && response.data.data) {
      return response.data.data.map(model => model.id);
    }

    return [];
  } catch (error) {
    await logError(error, 'Récupération des modèles disponibles');
    return [];
  }
}
