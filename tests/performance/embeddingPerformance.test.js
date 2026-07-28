/**
 * Tests de performance pour les embeddings
 * Mesure le temps de génération des embeddings et des calculs de similarité
 */

import {
  cosineSimilarity,
  euclideanDistance,
  getEmbeddingDimension,
  createZeroVector,
} from '../../src/modules/indexation/embeddingService.js';
import { stopPeriodicCleanup } from '../../src/modules/indexation/embeddingCache.js';

// Augmenter le timeout pour les tests de performance
jest.setTimeout(30000);

describe('Performance - Embedding Service', () => {
  afterEach(() => {
    // Arrêter le nettoyage périodique après chaque test
    stopPeriodicCleanup();
  });

  describe('cosineSimilarity', () => {
    test('should calculate similarity quickly for small vectors', () => {
      const vectorA = new Array(384).fill(0.5);
      const vectorB = new Array(384).fill(0.3);

      const startTime = performance.now();
      const similarity = cosineSimilarity(vectorA, vectorB);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(similarity).toBeDefined();
      expect(typeof similarity).toBe('number');
      expect(duration).toBeLessThan(10); // Moins de 10ms
    });

    test('should calculate similarity quickly for many vectors', () => {
      const vectorsA = Array(100).fill(null).map(() => new Array(384).fill(Math.random()));
      const vectorsB = Array(100).fill(null).map(() => new Array(384).fill(Math.random()));

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        cosineSimilarity(vectorsA[i], vectorsB[i]);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Moins de 100ms pour 100 calculs
    });

    test('should handle edge cases quickly', () => {
      const startTime = performance.now();
      
      // Vecteurs nuls
      cosineSimilarity(new Array(384).fill(0), new Array(384).fill(0));
      
      // Vecteurs de tailles différentes
      cosineSimilarity(new Array(384).fill(0), new Array(100).fill(0));
      
      // Vecteurs null
      cosineSimilarity(null, new Array(384).fill(0));
      cosineSimilarity(new Array(384).fill(0), null);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5); // Moins de 5ms
    });
  });

  describe('euclideanDistance', () => {
    test('should calculate distance quickly for small vectors', () => {
      const vectorA = new Array(384).fill(0.5);
      const vectorB = new Array(384).fill(0.3);

      const startTime = performance.now();
      const distance = euclideanDistance(vectorA, vectorB);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(distance).toBeDefined();
      expect(typeof distance).toBe('number');
      expect(duration).toBeLessThan(10); // Moins de 10ms
    });

    test('should calculate distance quickly for many vectors', () => {
      const vectorsA = Array(100).fill(null).map(() => new Array(384).fill(Math.random()));
      const vectorsB = Array(100).fill(null).map(() => new Array(384).fill(Math.random()));

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        euclideanDistance(vectorsA[i], vectorsB[i]);
      }
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Moins de 100ms pour 100 calculs
    });
  });

  describe('createZeroVector', () => {
    test('should create vector quickly', () => {
      const startTime = performance.now();
      const vector = createZeroVector();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(vector.length).toBe(384);
      expect(duration).toBeLessThan(1); // Moins de 1ms
    });

    test('should create many vectors quickly', () => {
      const startTime = performance.now();
      const vectors = Array(1000).fill(null).map(() => createZeroVector());
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(vectors.length).toBe(1000);
      expect(vectors.every(v => v.length === 384)).toBe(true);
      expect(duration).toBeLessThan(10); // Moins de 10ms pour 1000 vecteurs
    });
  });

  describe('getEmbeddingDimension', () => {
    test('should return dimension quickly', () => {
      const startTime = performance.now();
      const dimension = getEmbeddingDimension();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(dimension).toBe(384);
      expect(duration).toBeLessThan(0.1); // Moins de 0.1ms
    });
  });

  describe('Batch operations', () => {
    test('should calculate batch similarities quickly', () => {
      // Créer 1000 vecteurs
      const vectors = Array(1000).fill(null).map(() => {
        return new Array(384).fill(null).map(() => Math.random());
      });

      // Calculer la similarité entre chaque paire
      const startTime = performance.now();
      const similarityMatrix = [];
      
      for (let i = 0; i < 100; i++) {
        const row = [];
        for (let j = 0; j < 100; j++) {
          row.push(cosineSimilarity(vectors[i], vectors[j]));
        }
        similarityMatrix.push(row);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(similarityMatrix.length).toBe(100);
      expect(similarityMatrix[0].length).toBe(100);
      expect(duration).toBeLessThan(500); // Moins de 500ms pour 100x100 calculs
    });

    test('should find most similar vectors quickly', () => {
      // Créer 100 vecteurs
      const vectors = Array(100).fill(null).map((_, i) => {
        const vec = new Array(384).fill(0);
        vec[i % 384] = 1; // Chaque vecteur a une valeur différente
        return vec;
      });

      const queryVector = new Array(384).fill(0);
      queryVector[0] = 1; // Similaire au premier vecteur

      const startTime = performance.now();
      let mostSimilarIndex = 0;
      let highestSimilarity = -1;
      
      for (let i = 0; i < vectors.length; i++) {
        const similarity = cosineSimilarity(queryVector, vectors[i]);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarIndex = i;
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(mostSimilarIndex).toBe(0); // Le premier vecteur devrait être le plus similaire
      expect(highestSimilarity).toBe(1); // Similarité parfaite
      expect(duration).toBeLessThan(50); // Moins de 50ms
    });
  });
});
