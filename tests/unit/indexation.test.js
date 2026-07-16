/**
 * Tests unitaires pour le module d'indexation
 */

import {
  generateEmailHash,
  cleanText,
  isEmailTooLarge,
  extractMainBody,
  isFolderExcluded,
  getParentFolder,
  sleep,
  chunkArray,
} from '../../src/utils/helpers.js';

import {
  DEFAULT_CONFIG,
  getDefaultConfig,
} from '../../src/config/defaultConfig.js';

describe('Utils - Helpers', () => {
  describe('generateEmailHash', () => {
    test('should generate a hash for email with ID and lastModified', () => {
      const hash1 = generateEmailHash('email123', 1234567890);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
      expect(hash1.startsWith('email_')).toBe(true);
    });

    test('should generate different hashes for different inputs', () => {
      const hash1 = generateEmailHash('email123', 1234567890);
      const hash2 = generateEmailHash('email456', 1234567890);
      const hash3 = generateEmailHash('email123', 9876543210);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    test('should generate same hash for same inputs', () => {
      const hash1 = generateEmailHash('email123', 1234567890);
      const hash2 = generateEmailHash('email123', 1234567890);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('cleanText', () => {
    test('should remove HTML tags', () => {
      const htmlText = '<p>Hello <b>world</b></p>';
      const cleaned = cleanText(htmlText);
      expect(cleaned).toBe('Hello world');
    });

    test('should remove multiple spaces', () => {
      const textWithSpaces = 'Hello   world    !';
      const cleaned = cleanText(textWithSpaces);
      expect(cleaned).toBe('Hello world !');
    });

    test('should remove control characters', () => {
      const textWithControl = 'Hello\x00world\x1F!';
      const cleaned = cleanText(textWithControl);
      expect(cleaned).toBe('Hello world!');
    });

    test('should trim text', () => {
      const textWithSpaces = '  Hello world  ';
      const cleaned = cleanText(textWithSpaces);
      expect(cleaned).toBe('Hello world');
    });

    test('should handle null/undefined', () => {
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
      expect(cleanText('')).toBe('');
    });
  });

  describe('isEmailTooLarge', () => {
    test('should return false for small email', () => {
      const smallEmail = 'Hello world';
      const result = isEmailTooLarge(smallEmail, 1000);
      expect(result).toBe(false);
    });

    test('should return true for large email', () => {
      const largeEmail = 'a'.repeat(2000);
      const result = isEmailTooLarge(largeEmail, 1000);
      expect(result).toBe(true);
    });

    test('should handle null/undefined', () => {
      expect(isEmailTooLarge(null, 1000)).toBe(false);
      expect(isEmailTooLarge(undefined, 1000)).toBe(false);
    });
  });

  describe('extractMainBody', () => {
    test('should remove email quotes', () => {
      const emailWithQuote = 'Le 15/01/2024, John Doe a écrit :\n\nHello!\n\n> Le 14/01/2024, Jane Smith a écrit :\n> \n> Hi!\n\nResponse here.';
      const cleaned = extractMainBody(emailWithQuote);
      expect(cleaned).not.toContain('Le 15/01/2024, John Doe a écrit :');
      expect(cleaned).not.toContain('> Le 14/01/2024');
    });

    test('should remove signatures', () => {
      const emailWithSignature = 'Hello world\n\n--\nJohn Doe\nCEO';
      const cleaned = extractMainBody(emailWithSignature);
      expect(cleaned).not.toContain('--');
      expect(cleaned).not.toContain('John Doe');
    });

    test('should remove reply lines', () => {
      const emailWithReplies = 'Hello\n> On Jan 15, John wrote:\n> Hello\n\nResponse';
      const cleaned = extractMainBody(emailWithReplies);
      expect(cleaned).not.toContain('> On Jan 15');
    });

    test('should handle null/undefined', () => {
      expect(extractMainBody(null)).toBe('');
      expect(extractMainBody(undefined)).toBe('');
    });
  });

  describe('isFolderExcluded', () => {
    test('should return true for excluded folder', () => {
      const result = isFolderExcluded('Spam', ['Spam', 'Trash']);
      expect(result).toBe(true);
    });

    test('should return false for included folder', () => {
      const result = isFolderExcluded('Inbox', ['Spam', 'Trash']);
      expect(result).toBe(false);
    });

    test('should handle null/undefined', () => {
      expect(isFolderExcluded(null, ['Spam'])).toBe(false);
      expect(isFolderExcluded('Spam', null)).toBe(false);
    });
  });

  describe('getParentFolder', () => {
    test('should return parent folder from path', () => {
      const parent = getParentFolder('Inbox/Work/Project');
      expect(parent).toBe('Work');
    });

    test('should return empty string for root folder', () => {
      const parent = getParentFolder('Inbox');
      expect(parent).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(getParentFolder(null)).toBe('');
      expect(getParentFolder(undefined)).toBe('');
    });
  });

  describe('sleep', () => {
    test('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some margin
    });
  });

  describe('chunkArray', () => {
    test('should split array into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6];
      const chunks = chunkArray(array, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    test('should handle array length not divisible by chunk size', () => {
      const array = [1, 2, 3, 4, 5];
      const chunks = chunkArray(array, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    test('should handle empty array', () => {
      const chunks = chunkArray([], 2);
      expect(chunks).toEqual([]);
    });
  });
});

describe('Config - Default Config', () => {
  describe('DEFAULT_CONFIG', () => {
    test('should have correct structure', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('indexation');
      expect(DEFAULT_CONFIG).toHaveProperty('rag');
    });

    test('should have correct indexation defaults', () => {
      expect(DEFAULT_CONFIG.indexation.excludedFolders).toEqual(['Spam']);
      expect(DEFAULT_CONFIG.indexation.indexAttachments).toBe(false);
      expect(DEFAULT_CONFIG.indexation.maxEmailSize).toBe(10485760); // 10 Mo
    });

    test('should have correct RAG defaults', () => {
      expect(DEFAULT_CONFIG.rag.type).toBe('api_externe');
      expect(DEFAULT_CONFIG.rag.api.endpoint).toBe('https://api.mistral.ai/v1');
      expect(DEFAULT_CONFIG.rag.api.apiKey).toBe('');
      expect(DEFAULT_CONFIG.rag.local.url).toBe('http://localhost:11434');
      expect(DEFAULT_CONFIG.rag.local.model).toBe('mistral-7b');
    });
  });

  describe('getDefaultConfig', () => {
    test('should return a copy of DEFAULT_CONFIG', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).toEqual(DEFAULT_CONFIG);
      expect(config2).toEqual(DEFAULT_CONFIG);
      expect(config1).not.toBe(config2); // Should be different objects
    });

    test('should not allow modification of original', () => {
      const config = getDefaultConfig();
      config.indexation.excludedFolders.push('Trash');
      
      expect(DEFAULT_CONFIG.indexation.excludedFolders).not.toContain('Trash');
    });
  });
});
