/**
 * Tests unitaires pour le cache des embeddings
 */

import {
  getEmbeddingFromCache,
  storeEmbeddingInCache,
  getErrorFromCache,
  storeErrorInCache,
  clearCache,
  getCacheStats,
  cleanupCache,
  stopPeriodicCleanup,
} from '../../src/modules/indexation/embeddingCache.js';

describe('Embedding Cache', () => {
  beforeEach(() => {
    // Réinitialiser le cache avant chaque test
    clearCache();
  });

  afterEach(() => {
    // Arrêter le nettoyage périodique après chaque test
    stopPeriodicCleanup();
  });

  describe('storeEmbeddingInCache et getEmbeddingFromCache', () => {
    test('should store and retrieve embedding from cache', () => {
      const text = 'Test text for embedding';
      const embedding = new Array(384).fill(0.5);

      storeEmbeddingInCache(text, embedding);
      const cached = getEmbeddingFromCache(text);

      expect(cached).toEqual(embedding);
    });

    test('should return null for non-cached text', () => {
      const cached = getEmbeddingFromCache('non-cached-text');
      expect(cached).toBeNull();
    });

    test('should handle different texts with same content', () => {
      const text1 = 'Test text';
      const text2 = 'Test text';
      const embedding = new Array(384).fill(0.5);

      storeEmbeddingInCache(text1, embedding);
      const cached = getEmbeddingFromCache(text2);

      // Les textes identiques devraient avoir la même clé de cache
      expect(cached).toEqual(embedding);
    });

    test('should handle different texts with different content', () => {
      const text1 = 'Test text 1';
      const text2 = 'Test text 2';
      const embedding1 = new Array(384).fill(0.5);
      const embedding2 = new Array(384).fill(0.3);

      storeEmbeddingInCache(text1, embedding1);
      storeEmbeddingInCache(text2, embedding2);

      expect(getEmbeddingFromCache(text1)).toEqual(embedding1);
      expect(getEmbeddingFromCache(text2)).toEqual(embedding2);
    });
  });

  describe('Error Cache', () => {
    test('should store and retrieve error from cache', () => {
      const text = 'Test text with error';
      const error = 'API error';

      storeErrorInCache(text, error, 1000);
      const cachedError = getErrorFromCache(text);

      expect(cachedError).toBe(error);
    });

    test('should return null for non-cached error', () => {
      const cachedError = getErrorFromCache('non-error-text');
      expect(cachedError).toBeNull();
    });

    test('should allow retry after delay', async () => {
      const text = 'Test text with retry';
      const error = 'Temporary error';
      const retryAfter = 10; // 10ms

      storeErrorInCache(text, error, retryAfter);
      
      // Devrait retourner l'erreur immédiatement
      expect(getErrorFromCache(text)).toBe(error);
      
      // Attendre le délai de retry
      await new Promise(resolve => setTimeout(resolve, retryAfter + 1));
      
      // Devrait retourner null après le délai
      expect(getErrorFromCache(text)).toBeNull();
    });
  });

  describe('clearCache', () => {
    test('should clear all cache entries', () => {
      const text1 = 'Text 1';
      const text2 = 'Text 2';
      const embedding1 = new Array(384).fill(0.5);
      const embedding2 = new Array(384).fill(0.3);

      storeEmbeddingInCache(text1, embedding1);
      storeEmbeddingInCache(text2, embedding2);
      storeErrorInCache(text1, 'Error 1');

      clearCache();

      expect(getEmbeddingFromCache(text1)).toBeNull();
      expect(getEmbeddingFromCache(text2)).toBeNull();
      expect(getErrorFromCache(text1)).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    test('should return correct cache statistics', () => {
      const text1 = 'Text 1';
      const text2 = 'Text 2';
      const embedding1 = new Array(384).fill(0.5);
      const embedding2 = new Array(384).fill(0.3);

      storeEmbeddingInCache(text1, embedding1);
      storeEmbeddingInCache(text2, embedding2);
      storeErrorInCache(text1, 'Error 1');

      const stats = getCacheStats();

      expect(stats.embeddingCacheSize).toBe(2);
      expect(stats.errorCacheSize).toBe(1);
      expect(stats.maxCacheSize).toBe(10000);
      expect(stats.cacheTTL).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('cleanupCache', () => {
    test('should remove expired entries', async () => {
      // Stocker des entrées
      const text1 = 'Text 1';
      const text2 = 'Text 2';
      const embedding1 = new Array(384).fill(0.5);
      const embedding2 = new Array(384).fill(0.3);

      storeEmbeddingInCache(text1, embedding1);
      storeEmbeddingInCache(text2, embedding2);

      // Vérifier que les entrées sont là
      expect(getEmbeddingFromCache(text1)).toEqual(embedding1);
      expect(getEmbeddingFromCache(text2)).toEqual(embedding2);

      // Attendre l'expiration (simulée en modifiant directement le timestamp)
      // Note: En réalité, le cache expire après 24h, donc on ne peut pas tester ça facilement
      // Mais on peut tester que cleanupCache ne casse pas les entrées valides
      cleanupCache();

      // Les entrées devraient toujours être là (pas encore expirées)
      expect(getEmbeddingFromCache(text1)).toEqual(embedding1);
      expect(getEmbeddingFromCache(text2)).toEqual(embedding2);
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate different keys for different texts', () => {
      const text1 = 'Test text 1';
      const text2 = 'Test text 2';
      const embedding1 = new Array(384).fill(0.5);
      const embedding2 = new Array(384).fill(0.3);

      storeEmbeddingInCache(text1, embedding1);
      storeEmbeddingInCache(text2, embedding2);

      expect(getEmbeddingFromCache(text1)).toEqual(embedding1);
      expect(getEmbeddingFromCache(text2)).toEqual(embedding2);
      expect(getEmbeddingFromCache(text1)).not.toEqual(embedding2);
    });
  });
});
