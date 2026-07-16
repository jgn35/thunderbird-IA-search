/**
 * Tests d'intégration pour le flux d'indexation
 */

// Mock des modules pour éviter les dépendances réelles
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
        apiKey: '',
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
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
        }),
      }),
    })),
  };
});

// Mock de l'API Thunderbird
const mockMessages = {
  'msg1': {
    id: 'msg1',
    subject: 'Test Email 1',
    body: 'This is a test email',
    from: { value: 'test1@example.com' },
    to: { value: 'user@example.com' },
    date: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    folderId: 'folder1',
  },
  'msg2': {
    id: 'msg2',
    subject: 'Test Email 2',
    body: 'Another test email',
    from: { value: 'test2@example.com' },
    to: { value: 'user@example.com' },
    date: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    folderId: 'folder1',
  },
};

browser.messages = {
  list: jest.fn().mockImplementation((folderId, options) => {
    return Promise.resolve({
      messages: Object.values(mockMessages).map(msg => ({ id: msg.id })),
      total: Object.keys(mockMessages).length,
    });
  }),
  getFull: jest.fn().mockImplementation((messageId) => {
    return Promise.resolve(mockMessages[messageId] || null);
  }),
  get: jest.fn().mockImplementation((messageId) => {
    return Promise.resolve(mockMessages[messageId] || null);
  }),
};

browser.folders = {
  list: jest.fn().mockResolvedValue([
    { id: 'folder1', name: 'Inbox', accountId: 'account1' },
    { id: 'folder2', name: 'Spam', accountId: 'account1' },
  ]),
  get: jest.fn().mockImplementation((folderId) => {
    return Promise.resolve({ id: folderId, name: folderId === 'folder1' ? 'Inbox' : 'Spam' });
  }),
};

browser.accounts = {
  list: jest.fn().mockResolvedValue([
    { id: 'account1', name: 'Test Account' },
  ]),
};

// Import après les mocks
import {
  indexEmail,
  unindexEmail,
  indexAllEmails,
  clearIndex,
  getIndexStats,
  initIndexer,
} from '../../src/modules/indexation/indexer.js';

describe('Indexation Flow - Integration Tests', () => {
  beforeEach(async () => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
  });

  describe('initIndexer', () => {
    test('should initialize the indexer', async () => {
      await expect(initIndexer()).resolves.not.toThrow();
    });
  });

  describe('indexEmail', () => {
    test('should index a valid email', async () => {
      const emailData = {
        id: 'test123',
        subject: 'Test Subject',
        body: 'Test body content',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: Date.now(),
        folderName: 'Inbox',
        lastModified: Date.now(),
      };

      // Mock emailExists pour retourner true
      const originalModule = await import('../../src/modules/indexation/emailFetcher.js');
      jest.spyOn(originalModule, 'emailExists').mockResolvedValue(true);

      const result = await indexEmail(emailData);
      expect(result).toBe(true);
    });

    test('should return false for non-existent email', async () => {
      const emailData = {
        id: 'nonexistent',
        subject: 'Test Subject',
        body: 'Test body content',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: Date.now(),
        folderName: 'Inbox',
        lastModified: Date.now(),
      };

      // Mock emailExists pour retourner false
      const originalModule = await import('../../src/modules/indexation/emailFetcher.js');
      jest.spyOn(originalModule, 'emailExists').mockResolvedValue(false);

      const result = await indexEmail(emailData);
      expect(result).toBe(false);
    });
  });

  describe('indexAllEmails', () => {
    test('should index all emails from selected folders', async () => {
      const selectedFolders = ['folder1'];
      
      // Mock fetchEmailsForIndexation pour retourner des emails
      const originalModule = await import('../../src/modules/indexation/emailFetcher.js');
      jest.spyOn(originalModule, 'fetchEmailsForIndexation').mockResolvedValue([
        {
          id: 'msg1',
          subject: 'Test Email 1',
          body: 'This is a test email',
          from: 'test1@example.com',
          to: 'user@example.com',
          date: Date.now(),
          folderName: 'Inbox',
          lastModified: Date.now(),
        },
      ]);

      const result = await indexAllEmails(selectedFolders);
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
    });

    test('should return error when no folders selected', async () => {
      const result = await indexAllEmails([]);
      expect(result.success).toBe(false);
    });
  });

  describe('clearIndex', () => {
    test('should clear the index', async () => {
      const result = await clearIndex();
      expect(result.success).toBe(true);
    });
  });

  describe('getIndexStats', () => {
    test('should return index statistics', async () => {
      const stats = await getIndexStats();
      expect(stats).toHaveProperty('totalIndexed');
      expect(stats).toHaveProperty('lastIndexation');
      expect(stats).toHaveProperty('isIndexing');
    });
  });
});
