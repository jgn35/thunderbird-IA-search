/**
 * Tests unitaires pour le module de recherche
 */

import {
  detectLanguage,
  removeStopWords,
  normalizeQuery,
  isValidQuery,
  processQuery,
  extractKeywords,
  getStopWords,
  getSupportedLanguages,
} from '../../src/modules/recherche/queryProcessor.js';

describe('Recherche - Query Processor', () => {
  describe('detectLanguage', () => {
    test('should detect French for French text', () => {
      const frenchText = 'Bonjour comment ça va aujourd\'hui';
      const language = detectLanguage(frenchText);
      expect(language).toBe('fr');
    });

    test('should detect English for English text', () => {
      const englishText = 'Hello how are you today';
      const language = detectLanguage(englishText);
      expect(language).toBe('en');
    });

    test('should return English as default for empty string', () => {
      const language = detectLanguage('');
      expect(language).toBe('en');
    });

    test('should return English for null/undefined', () => {
      expect(detectLanguage(null)).toBe('en');
      expect(detectLanguage(undefined)).toBe('en');
    });
  });

  describe('removeStopWords', () => {
    test('should remove French stop words when language specified', () => {
      const text = 'le la les de des du un une et ou';
      const cleaned = removeStopWords(text, 'fr');
      expect(cleaned).toBe('');
    });

    test('should remove English stop words when language specified', () => {
      const text = 'the a an and or but';
      const cleaned = removeStopWords(text, 'en');
      expect(cleaned).toBe('');
    });

    test('should handle empty string', () => {
      expect(removeStopWords('', 'fr')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(removeStopWords(null, 'fr')).toBe('');
      expect(removeStopWords(undefined, 'fr')).toBe('');
    });
  });

  describe('normalizeQuery', () => {
    test('should clean and normalize text', () => {
      const text = '<p>Hello   World!  </p>';
      const normalized = normalizeQuery(text);
      expect(normalized).toBe('hello world');
    });

    test('should remove stop words', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const normalized = normalizeQuery(text);
      expect(normalized).not.toContain('the');
      expect(normalized).not.toContain('over');
    });

    test('should handle empty string', () => {
      expect(normalizeQuery('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(normalizeQuery(null)).toBe('');
      expect(normalizeQuery(undefined)).toBe('');
    });
  });

  describe('isValidQuery', () => {
    test('should return true for valid query', () => {
      expect(isValidQuery('hello world')).toBe(true);
      expect(isValidQuery('test')).toBe(true);
      expect(isValidQuery('ab')).toBe(true); // 2 caractères est valide
    });

    test('should return false for very short query', () => {
      expect(isValidQuery('a')).toBe(false);
    });

    test('should return false for empty query', () => {
      expect(isValidQuery('')).toBe(false);
    });

    test('should return false for null/undefined', () => {
      expect(isValidQuery(null)).toBe(false);
      expect(isValidQuery(undefined)).toBe(false);
    });
  });

  describe('processQuery', () => {
    test('should return processed query with language', () => {
      const result = processQuery('Bonjour le monde');
      expect(result.isValid).toBe(true);
      expect(result.processedQuery).toBeDefined();
      expect(result.language).toBeDefined();
      expect(['fr', 'en']).toContain(result.language);
    });

    test('should return isValid false for invalid query', () => {
      const result = processQuery('a');
      expect(result.isValid).toBe(false);
    });

    test('should handle empty string', () => {
      const result = processQuery('');
      expect(result.isValid).toBe(false);
    });

    test('should handle null/undefined', () => {
      const result1 = processQuery(null);
      const result2 = processQuery(undefined);
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('extractKeywords', () => {
    test('should extract keywords from query', () => {
      const keywords = extractKeywords('hello world test example', 3);
      expect(keywords.length).toBeLessThanOrEqual(3);
      expect(keywords).toContain('hello');
      expect(keywords).toContain('world');
    });

    test('should limit number of keywords', () => {
      const keywords = extractKeywords('one two three four five', 2);
      expect(keywords.length).toBe(2);
    });

    test('should return empty array for invalid query', () => {
      const keywords = extractKeywords('a', 5);
      expect(keywords).toEqual([]);
    });

    test('should handle null/undefined', () => {
      expect(extractKeywords(null, 5)).toEqual([]);
      expect(extractKeywords(undefined, 5)).toEqual([]);
    });
  });

  describe('getStopWords', () => {
    test('should return French stop words', () => {
      const stopWords = getStopWords('fr');
      expect(stopWords).toBeInstanceOf(Set);
      expect(stopWords.has('le')).toBe(true);
      expect(stopWords.has('la')).toBe(true);
    });

    test('should return English stop words', () => {
      const stopWords = getStopWords('en');
      expect(stopWords).toBeInstanceOf(Set);
      expect(stopWords.has('the')).toBe(true);
      expect(stopWords.has('a')).toBe(true);
    });

    test('should return empty set for unknown language', () => {
      const stopWords = getStopWords('es');
      expect(stopWords).toBeInstanceOf(Set);
      expect(stopWords.size).toBe(0);
    });
  });

  describe('getSupportedLanguages', () => {
    test('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('fr');
      expect(languages).toContain('en');
    });
  });
});
