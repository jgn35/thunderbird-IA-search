/**
 * Cache pour les embeddings
 * Stocke les embeddings déjà générés pour éviter les appels API redondants
 * @module modules/indexation/embeddingCache
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Taille maximale du cache (nombre d'entrées)
 * @type {number}
 */
const MAX_CACHE_SIZE = 10000;

/**
 * Durée de vie maximale des entrées du cache (en ms) - 24 heures
 * @type {number}
 */
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Cache des embeddings
 * @type {Map<string, {embedding: number[], timestamp: number}>}
 */
const embeddingCache = new Map();

/**
 * Cache des erreurs (pour éviter de réessayer trop souvent)
 * @type {Map<string, {error: string, timestamp: number, retryAfter: number}>}
 */
const errorCache = new Map();

/**
 * Timer pour le nettoyage périodique
 * @type {NodeJS.Timeout|null}
 */
let cleanupTimer = null;

/**
 * Génère une clé de cache pour un texte
 * @param {string} text - Texte à hacher
 * @returns {string} Clé de cache
 */
function generateCacheKey(text) {
  // Simple hash function for strings
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `emb_${Math.abs(hash).toString(16)}_${text.length}`;
}

/**
 * Vérifie si une entrée du cache est expirée
 * @param {number} timestamp - Timestamp de l'entrée
 * @returns {boolean} Vrai si l'entrée est expirée
 */
function isCacheEntryExpired(timestamp) {
  return Date.now() - timestamp > CACHE_TTL;
}

/**
 * Vérifie si une entrée du cache d'erreur est prête pour un nouvel essai
 * @param {number} timestamp - Timestamp de l'erreur
 * @param {number} retryAfter - Délai avant nouvel essai (en ms)
 * @returns {boolean} Vrai si un nouvel essai peut être tenté
 */
function canRetryAfterError(timestamp, retryAfter) {
  return Date.now() - timestamp > retryAfter;
}

/**
 * Récupère un embedding depuis le cache
 * @param {string} text - Texte pour lequel récupérer l'embedding
 * @returns {number[]|null} L'embedding ou null si non trouvé ou expiré
 */
export function getEmbeddingFromCache(text) {
  const cacheKey = generateCacheKey(text);
  const cached = embeddingCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  if (isCacheEntryExpired(cached.timestamp)) {
    // Supprimer l'entrée expirée
    embeddingCache.delete(cacheKey);
    return null;
  }
  
  return cached.embedding;
}

/**
 * Stocke un embedding dans le cache
 * @param {string} text - Texte pour lequel stocker l'embedding
 * @param {number[]} embedding - L'embedding à stocker
 */
export function storeEmbeddingInCache(text, embedding) {
  const cacheKey = generateCacheKey(text);
  
  // Si le cache est plein, supprimer les entrées les plus anciennes
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    cleanupCache();
  }
  
  embeddingCache.set(cacheKey, {
    embedding,
    timestamp: Date.now(),
  });
}

/**
 * Vérifie si une erreur est en cache pour un texte
 * @param {string} text - Texte pour lequel vérifier
 * @returns {string|null} Le message d'erreur ou null si pas d'erreur en cache ou prêt pour nouvel essai
 */
export function getErrorFromCache(text) {
  const cacheKey = generateCacheKey(text);
  const cachedError = errorCache.get(cacheKey);
  
  if (!cachedError) {
    return null;
  }
  
  if (canRetryAfterError(cachedError.timestamp, cachedError.retryAfter)) {
    // Supprimer l'erreur du cache
    errorCache.delete(cacheKey);
    return null;
  }
  
  return cachedError.error;
}

/**
 * Stocke une erreur dans le cache
 * @param {string} text - Texte pour lequel stocker l'erreur
 * @param {string} error - Le message d'erreur
 * @param {number} [retryAfter=300000] - Délai avant nouvel essai (en ms, par défaut 5 minutes)
 */
export function storeErrorInCache(text, error, retryAfter = 300000) {
  const cacheKey = generateCacheKey(text);
  
  errorCache.set(cacheKey, {
    error,
    timestamp: Date.now(),
    retryAfter,
  });
}

/**
 * Nettoie le cache des entrées expirées
 */
export function cleanupCache() {
  const now = Date.now();
  
  // Nettoyer le cache des embeddings
  for (const [key, value] of embeddingCache.entries()) {
    if (isCacheEntryExpired(value.timestamp)) {
      embeddingCache.delete(key);
    }
  }
  
  // Nettoyer le cache des erreurs
  for (const [key, value] of errorCache.entries()) {
    if (canRetryAfterError(value.timestamp, value.retryAfter)) {
      errorCache.delete(key);
    }
  }
  
  // Si le cache est toujours trop grand, supprimer les entrées les plus anciennes
  while (embeddingCache.size > MAX_CACHE_SIZE * 0.8) {
    const oldestKey = embeddingCache.keys().next().value;
    embeddingCache.delete(oldestKey);
  }
}

/**
 * Efface complètement le cache
 */
export function clearCache() {
  embeddingCache.clear();
  errorCache.clear();
}

/**
 * Récupère les statistiques du cache
 * @returns {Object} Statistiques du cache
 */
export function getCacheStats() {
  return {
    embeddingCacheSize: embeddingCache.size,
    errorCacheSize: errorCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
    cacheTTL: CACHE_TTL,
  };
}

/**
 * Nettoie périodiquement le cache
 * @param {number} [interval=3600000] - Intervalle de nettoyage (en ms, par défaut 1 heure)
 */
export function startPeriodicCleanup(interval = 3600000) {
  // Arrêter le nettoyage périodique existant s'il y en a un
  stopPeriodicCleanup();
  
  // Nettoyer immédiatement
  cleanupCache();
  
  // Nettoyer périodiquement
  cleanupTimer = setInterval(() => {
    try {
      cleanupCache();
    } catch (error) {
      logError(error, 'Nettoyage périodique du cache');
    }
  }, interval);
}

/**
 * Arrête le nettoyage périodique du cache
 */
export function stopPeriodicCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Démarrer le nettoyage périodique
startPeriodicCleanup();
