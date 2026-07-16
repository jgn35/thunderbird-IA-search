/**
 * Tests d'intégration pour le flux RAG
 */

// Mock des modules
jest.mock('../../src/utils/logger.js', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock('../../src/config/storageManager.js', () => ({
  getConfig: jest.fn().mockResolvedValue({
    indexation: {
      excludedFolders: ['Spam'],
      indexAttachments: false,
      maxEmailSize: 10485760,
    },
    rag: {
      type: 'api_externe',
      api: {
        endpoint: 'https://api.mistral.ai/v1',
        apiKey: 'test-api-key',
      },
      local: {
        url: 'http://localhost:11434',
        model: 'mistral-7b',
      },
    },
    selectedFolders: [],
  }),
  saveConfig: jest.fn().mockResolvedValue(true),
}));

// Mock de ChromaDB
jest.mock('chromadb', () => {
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      listCollections: jest.fn().mockResolvedValue([]),
      getCollection: jest.fn(),
      createCollection: jest.fn().mockResolvedValue({
        name: 'thunderbird_emails',
        upsert: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue({
          ids: [],
          documents: [],
          metadatas: [],
        }),
        delete: jest.fn().mockResolvedValue(true),
        query: jest.fn().mockResolvedValue({
          ids: [['id1', 'id2']],
          documents: [
            JSON.stringify({
              id: 'id1',
              emailId: 'msg1',
              subject: 'Test Email',
              body: 'This is a test email about meeting on January 15th',
              from: 'test@example.com',
              to: 'user@example.com',
              date: Date.now(),
              folderName: 'Inbox',
            }),
            JSON.stringify({
              id: 'id2',
              emailId: 'msg2',
              subject: 'Another Email',
              body: 'Another test email',
              from: 'test2@example.com',
              to: 'user@example.com',
              date: Date.now(),
              folderName: 'Inbox',
            }),
          ],
          metadatas: [
            {
              emailId: 'msg1',
              subject: 'Test Email',
              from: 'test@example.com',
              to: 'user@example.com',
              date: Date.now(),
              folderName: 'Inbox',
            },
            {
              emailId: 'msg2',
              subject: 'Another Email',
              from: 'test2@example.com',
              to: 'user@example.com',
              date: Date.now(),
              folderName: 'Inbox',
            },
          ],
          distances: [[0.1, 0.2]],
        }),
      }),
    })),
  };
});

// Mock de Axios pour les appels API
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      choices: [
        {
          message: {
            content: 'La réunion est prévue pour le 15 janvier.',
          },
        },
      ],
      model: 'mistral-tiny',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    },
  }),
  get: jest.fn().mockResolvedValue({
    data: {
      data: [
        { id: 'mistral-tiny' },
        { id: 'mistral-small' },
      ],
    },
  }),
}));

// Import après les mocks
import {
  performRAG,
  checkRAGConfig,
  getCurrentLLMType,
  setLLMType,
} from '../../src/modules/generation/ragOrchestrator.js';

describe('RAG Flow - Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('performRAG', () => {
    test('should perform RAG with valid question', async () => {
      const result = await performRAG('Quelle est la date de la réunion ?');
      
      expect(result.success).toBe(true);
      expect(result.question).toBe('Quelle est la date de la réunion ?');
      expect(result.answer).toBeDefined();
      expect(result.context).toBeDefined();
      expect(Array.isArray(result.context)).toBe(true);
      expect(result.llmType).toBe('api_externe');
      expect(result.model).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    test('should handle empty question', async () => {
      const result = await performRAG('');
      expect(result.success).toBe(false);
    });

    test('should use local LLM when specified', async () => {
      const result = await performRAG('Test question', { llmType: 'local' });
      expect(result.llmType).toBe('local');
    });

    test('should return context with search results', async () => {
      const result = await performRAG('meeting date');
      
      expect(result.context.length).toBeGreaterThan(0);
      expect(result.context[0]).toHaveProperty('emailId');
      expect(result.context[0]).toHaveProperty('subject');
      expect(result.context[0]).toHaveProperty('body');
    });
  });

  describe('checkRAGConfig', () => {
    test('should validate API configuration', async () => {
      const result = await checkRAGConfig();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('llmType');
    });

    test('should detect invalid configuration', async () => {
      // Mock getConfig pour retourner une config invalide
      const originalModule = await import('../../src/config/storageManager.js');
      jest.spyOn(originalModule, 'getConfig').mockResolvedValueOnce({
        rag: {
          type: 'api_externe',
          api: {
            endpoint: '',
            apiKey: '',
          },
        },
      });

      const result = await checkRAGConfig();
      expect(result.isValid).toBe(false);
    });
  });

  describe('getCurrentLLMType', () => {
    test('should return current LLM type', async () => {
      const llmType = await getCurrentLLMType();
      expect(llmType).toBe('api_externe');
    });
  });

  describe('setLLMType', () => {
    test('should set LLM type to local', async () => {
      const result = await setLLMType('local');
      expect(result.success).toBe(true);
      expect(result.llmType).toBe('local');
    });

    test('should set LLM type to api_externe', async () => {
      const result = await setLLMType('api_externe');
      expect(result.success).toBe(true);
      expect(result.llmType).toBe('api_externe');
    });

    test('should reject invalid LLM type', async () => {
      const result = await setLLMType('invalid');
      expect(result.success).toBe(false);
    });
  });
});
