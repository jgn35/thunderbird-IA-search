/**
 * Tests unitaires pour le service d'embeddings
 */

import {
  cosineSimilarity,
  euclideanDistance,
  getEmbeddingDimension,
  createZeroVector,
} from '../../src/modules/indexation/embeddingService.js';

describe('Embedding Service', () => {
  describe('cosineSimilarity', () => {
    test('should return 1 for identical vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2, 3];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(1);
    });

    test('should return 0 for orthogonal vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    test('should return 0 for zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    test('should return 0 for different dimension vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    test('should return 0 for null/undefined vectors', () => {
      expect(cosineSimilarity(null, [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], null)).toBe(0);
      expect(cosineSimilarity(null, null)).toBe(0);
    });

    test('should calculate correct similarity for known vectors', () => {
      // Vecteurs avec un angle connu
      const vectorA = [1, 0, 0];
      const vectorB = [1, 1, 0];
      // cos(theta) = (1*1 + 0*1 + 0*0) / (1 * sqrt(2)) = 1/sqrt(2) ≈ 0.7071
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0.7071, 4);
    });
  });

  describe('euclideanDistance', () => {
    test('should return 0 for identical vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2, 3];
      const distance = euclideanDistance(vectorA, vectorB);
      expect(distance).toBe(0);
    });

    test('should return correct distance for simple vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [3, 4, 0];
      // distance = sqrt((3-0)^2 + (4-0)^2 + (0-0)^2) = sqrt(9 + 16) = sqrt(25) = 5
      const distance = euclideanDistance(vectorA, vectorB);
      expect(distance).toBe(5);
    });

    test('should return Infinity for different dimension vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];
      const distance = euclideanDistance(vectorA, vectorB);
      expect(distance).toBe(Infinity);
    });

    test('should return Infinity for null/undefined vectors', () => {
      expect(euclideanDistance(null, [1, 2, 3])).toBe(Infinity);
      expect(euclideanDistance([1, 2, 3], null)).toBe(Infinity);
      expect(euclideanDistance(null, null)).toBe(Infinity);
    });
  });

  describe('getEmbeddingDimension', () => {
    test('should return the correct dimension', () => {
      const dimension = getEmbeddingDimension();
      expect(dimension).toBe(384); // Dimension pour mistral-embed-text
    });
  });

  describe('createZeroVector', () => {
    test('should create a vector of correct dimension filled with zeros', () => {
      const zeroVector = createZeroVector();
      expect(zeroVector.length).toBe(384);
      expect(zeroVector.every(val => val === 0)).toBe(true);
    });
  });
});
