/**
 * Service de gestion des embeddings pour l'extension Thunderbird RAG Search
 * Utilise l'API Mistral Embeddings pour générer des vecteurs
 * @module modules/indexation/embeddingService
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';
import {
  getEmbeddingFromCache,
  storeEmbeddingInCache,
  getErrorFromCache,
  storeErrorInCache,
  clearCache,
  getCacheStats,
} from './embeddingCache.js';

/**
 * Dimension des embeddings Mistral (à vérifier selon le modèle utilisé)
 * @type {number}
 */
const EMBEDDING_DIMENSION = 1024; // Dimension pour mistral-embed

/**
 * Timeout par défaut pour les requêtes API (en ms)
 * @type {number}
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Endpoint par défaut pour les embeddings Mistral
 * @type {string}
 */
const DEFAULT_EMBEDDING_ENDPOINT = 'https://api.mistral.ai/v1/embeddings';

/**
 * Modèle par défaut pour les embeddings
 * @type {string}
 */
const DEFAULT_EMBEDDING_MODEL = 'mistral-embed';

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
 * Vérifie si la configuration des embeddings est valide
 * @param {Object} config - Configuration des embeddings
 * @returns {boolean} Vrai si la configuration est valide
 */
function isEmbeddingConfigValid(config) {
  return config && 
    config.endpoint && 
    config.endpoint.trim() !== '' &&
    config.apiKey && 
    config.apiKey.trim() !== '';
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
 * Génère des embeddings pour un ou plusieurs textes
 * @param {string|string[]} texts - Texte(s) à transformer en embeddings
 * @param {Object} [options] - Options supplémentaires
 * @param {string} [options.model] - Modèle à utiliser
 * @param {boolean} [options.useCache=true] - Utiliser le cache
 * @param {Object} [options.config] - Configuration personnalisée
 * @returns {Promise<Object>} Résultat avec les embeddings
 */
export async function generateEmbeddings(texts, options = {}) {
  const {
    model = DEFAULT_EMBEDDING_MODEL,
    useCache = true,
    config: customConfig = null,
  } = options;

  try {
    // Récupérer la configuration
    const currentConfig = customConfig || await getConfig();
    const embeddingConfig = currentConfig.rag?.api || {};

    // Vérifier la configuration
    if (!isEmbeddingConfigValid(embeddingConfig)) {
      await logError(new Error('Configuration API Mistral invalide'), 'Génération des embeddings');
      return {
        success: false,
        error: 'Configuration API invalide. Veuillez configurer votre clé API et endpoint pour les embeddings.',
      };
    }

    const endpoint = embeddingConfig.endpoint.endsWith('/') 
      ? embeddingConfig.endpoint.slice(0, -1) 
      : embeddingConfig.endpoint;
    const apiKey = embeddingConfig.apiKey;

    // Normaliser les textes en tableau
    const textArray = Array.isArray(texts) ? texts : [texts];

    // Filtrer les textes vides
    const validTexts = textArray.filter(text => text && text.trim() !== '');
    
    if (validTexts.length === 0) {
      return {
        success: true,
        embeddings: [],
        model: model,
      };
    }

    // Vérifier le cache pour chaque texte
    const cachedEmbeddings = [];
    const textsToGenerate = [];
    const cacheIndices = [];
    
    if (useCache) {
      for (let i = 0; i < validTexts.length; i++) {
        const cached = getEmbeddingFromCache(validTexts[i]);
        if (cached) {
          cachedEmbeddings.push(cached);
          cacheIndices.push(i);
        } else {
          // Vérifier si une erreur est en cache
          const cachedError = getErrorFromCache(validTexts[i]);
          if (cachedError) {
            await logWarn(`Erreur en cache pour le texte ${i}: ${cachedError}`);
            // Retourner une erreur
            return {
              success: false,
              error: `Erreur en cache: ${cachedError}`,
            };
          }
          textsToGenerate.push(validTexts[i]);
        }
      }
    } else {
      textsToGenerate.push(...validTexts);
    }

    // Si tous les embeddings sont en cache, retourner le résultat
    if (textsToGenerate.length === 0) {
      await logInfo(`Tous les embeddings récupérés depuis le cache (${cachedEmbeddings.length} textes)`);
      return {
        success: true,
        embeddings: cachedEmbeddings,
        model: model,
        cached: true,
      };
    }

    // Générer les embeddings pour les textes non en cache
    const payload = {
      model,
      input: textsToGenerate,
    };

    await logInfo(`Génération d'embeddings pour ${textsToGenerate.length} textes (modèle: ${model})`);

    // Effectuer la requête avec fetch
    const response = await fetchWithTimeout(
      `${endpoint}/embeddings`,
      {
        method: 'POST',
        headers: getDefaultHeaders(apiKey),
        body: JSON.stringify(payload),
      }
    );

    // Traiter la réponse
    const responseData = await response.json();
    
    if (!response.ok) {
      let errorMessage = 'Erreur API Mistral Embeddings';
      if (responseData && responseData.message) {
        errorMessage = responseData.message;
      }
      
      const status = response.status;
      if (status === 401) {
        errorMessage = 'Clé API invalide. Veuillez vérifier votre configuration.';
      } else if (status === 404) {
        errorMessage = 'Endpoint API introuvable. Veuillez vérifier l\'URL.';
      } else if (status >= 500) {
        errorMessage = 'Erreur serveur chez Mistral AI. Veuillez réessayer plus tard.';
      }
      
      await logError(new Error(errorMessage), 'Génération des embeddings');
      
      // Stocker l'erreur dans le cache pour les textes concernés
      if (useCache && errorMessage) {
        for (const text of textsToGenerate) {
          storeErrorInCache(text, errorMessage, 300000); // 5 minutes
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        response: responseData,
      };
    }

    if (responseData && responseData.data && responseData.data.length > 0) {
      const newEmbeddings = responseData.data.map(item => item.embedding);

      // Stocker les nouveaux embeddings dans le cache
      if (useCache) {
        for (let i = 0; i < textsToGenerate.length; i++) {
          storeEmbeddingInCache(textsToGenerate[i], newEmbeddings[i]);
        }
      }

      // Combiner les embeddings en cache et les nouveaux
      const allEmbeddings = [];
      let cacheIndex = 0;
      let newIndex = 0;
      
      for (let i = 0; i < validTexts.length; i++) {
        if (useCache && cacheIndices.includes(i)) {
          allEmbeddings.push(cachedEmbeddings[cacheIndex++]);
        } else {
          allEmbeddings.push(newEmbeddings[newIndex++]);
        }
      }

      await logInfo(`Embeddings générés avec succès : ${allEmbeddings.length} vecteurs (${newEmbeddings.length} nouveaux, ${cachedEmbeddings.length} en cache)`);

      return {
        success: true,
        embeddings: allEmbeddings,
        model: responseData.model,
        usage: responseData.usage,
        cached: cachedEmbeddings.length > 0,
      };
    }

    await logWarn('Réponse API embeddings invalide', responseData);
    return {
      success: false,
      error: 'Réponse API invalide.',
      response: responseData,
    };
  } catch (error) {
    await logError(error, 'Génération des embeddings');
    
    let errorMessage = 'Une erreur est survenue lors de la génération des embeddings.';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout : La requête a pris trop de temps. Veuillez réessayer.';
    } else if (error.code === 'ENOTFOUND' || error.message?.includes('Failed to fetch')) {
      errorMessage = 'Impossible de se connecter à l\'API. Vérifiez votre connexion internet.';
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
 * Génère un embedding pour un seul texte
 * @param {string} text - Texte à transformer
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<Object>} Résultat avec l'embedding
 */
export async function generateSingleEmbedding(text, options = {}) {
  const result = await generateEmbeddings(text, { useCache: true, ...options });
  
  if (!result.success) {
    return result;
  }

  return {
    success: true,
    embedding: result.embeddings[0],
    model: result.model,
  };
}

/**
 * Génère des embeddings par lots (batch)
 * @param {string[]} texts - Tableau de textes
 * @param {number} [batchSize=10] - Taille de chaque batch
 * @param {Object} [options] - Options supplémentaires
 * @returns {Promise<Object>} Résultat avec tous les embeddings
 */
export async function generateEmbeddingsBatch(texts, batchSize = 10, options = {}) {
  const allEmbeddings = [];
  const allErrors = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await generateEmbeddings(batch, options);
    
    if (result.success) {
      allEmbeddings.push(...result.embeddings);
    } else {
      allErrors.push(result.error);
    }
  }

  return {
    success: allErrors.length === 0,
    embeddings: allEmbeddings,
    errors: allErrors,
    count: allEmbeddings.length,
  };
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 * @param {number[]} vectorA - Premier vecteur
 * @param {number[]} vectorB - Deuxième vecteur
 * @returns {number} Score de similarité (0 à 1, 1 = identique)
 */
export function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calcule la distance euclidienne entre deux vecteurs
 * @param {number[]} vectorA - Premier vecteur
 * @param {number[]} vectorB - Deuxième vecteur
 * @returns {number} Distance euclidienne
 */
export function euclideanDistance(vectorA, vectorB) {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    sum += Math.pow(vectorA[i] - vectorB[i], 2);
  }

  return Math.sqrt(sum);
}

/**
 * Vérifie la configuration des embeddings
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkEmbeddingConfig() {
  try {
    const config = await getConfig();
    const apiConfig = config.rag?.api || {};

    if (!isEmbeddingConfigValid(apiConfig)) {
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
      model: apiConfig.model || DEFAULT_EMBEDDING_MODEL,
    };
  } catch (error) {
    await logError(error, 'Vérification de la configuration des embeddings');
    return {
      isValid: false,
      error: error.message || 'Erreur lors de la vérification.',
    };
  }
}

/**
 * Récupère la dimension des embeddings
 * @returns {number} Dimension des embeddings
 */
export function getEmbeddingDimension() {
  return EMBEDDING_DIMENSION;
}

/**
 * Crée un vecteur nul de la bonne dimension
 * @returns {number[]} Vecteur nul
 */
export function createZeroVector() {
  return new Array(EMBEDDING_DIMENSION).fill(0);
}

/**
 * Efface le cache des embeddings
 * @returns {void}
 */
export function clearEmbeddingCache() {
  clearCache();
}

/**
 * Récupère les statistiques du cache
 * @returns {Object} Statistiques du cache
 */
export function getEmbeddingCacheStats() {
  return getCacheStats();
}
