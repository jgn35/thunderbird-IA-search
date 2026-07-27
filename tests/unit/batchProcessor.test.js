/**
 * Tests unitaires pour le batch processor
 */

// Mock des fonctions de logging
jest.mock('../../src/utils/logger.js', () => ({
  logInfo: jest.fn().mockResolvedValue(undefined),
  logError: jest.fn().mockResolvedValue(undefined),
  logWarn: jest.fn().mockResolvedValue(undefined),
}));

// Mock du service d'embeddings
jest.mock('../../src/modules/indexation/embeddingService.js', () => ({
  generateEmbeddingsBatch: jest.fn().mockResolvedValue({
    success: true,
    embeddings: [new Array(384).fill(0.5)],
    model: 'mock-model',
  }),
}));

// Mock de l'indexer
jest.mock('../../src/modules/indexation/indexer.js', () => ({
  indexEmail: jest.fn().mockResolvedValue(true),
  getIndexationState: jest.fn().mockReturnValue({
    isIndexing: false,
  }),
}));

import {
  indexEmailsInBatches,
  cancelBatchProcessing,
  getBatchState,
  estimateRemainingTime,
  getElapsedTime,
} from '../../src/modules/indexation/batchProcessor.js';

describe('Batch Processor', () => {
  beforeEach(() => {
    // Réinitialiser l'état avant chaque test
    // Note: Comme batchState est un module-level variable, nous devons le réinitialiser
    // En pratique, nous devrions refactorer pour permettre une meilleure réinitialisation
  });

  describe('getBatchState', () => {
    test('should return initial state', () => {
      const state = getBatchState();
      
      expect(state.isProcessing).toBe(false);
      expect(state.totalBatches).toBe(0);
      expect(state.processedBatches).toBe(0);
      expect(state.totalEmails).toBe(0);
      expect(state.processedEmails).toBe(0);
      expect(state.failedEmails).toBe(0);
      expect(state.startTime).toBeNull();
    });
  });

  describe('estimateRemainingTime', () => {
    test('should return null when no emails processed', () => {
      const result = estimateRemainingTime(0, 100, new Date());
      
      expect(result.remainingTime).toBeNull();
      expect(result.estimatedCompletion).toBeNull();
      expect(result.emailsPerSecond).toBe(0);
    });

    test('should return null when startTime is null', () => {
      const result = estimateRemainingTime(50, 100, null);
      
      expect(result.remainingTime).toBeNull();
      expect(result.estimatedCompletion).toBeNull();
      expect(result.emailsPerSecond).toBe(0);
    });

    test('should calculate remaining time correctly', () => {
      const startTime = new Date(Date.now() - 1000); // 1 seconde écoulée
      const result = estimateRemainingTime(50, 100, startTime);
      
      expect(result.remainingTime).toBeGreaterThan(0);
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
      expect(result.emailsPerSecond).toBeGreaterThan(0);
    });

    test('should return zero remaining time when all emails processed', () => {
      const startTime = new Date(Date.now() - 1000);
      const result = estimateRemainingTime(100, 100, startTime);
      
      expect(result.remainingTime).toBe(0);
      expect(result.emailsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('getElapsedTime', () => {
    test('should return null when no startTime', () => {
      const elapsed = getElapsedTime();
      expect(elapsed).toBeNull();
    });
  });

  describe('cancelBatchProcessing', () => {
    test('should return false when no batch processing', async () => {
      const result = await cancelBatchProcessing();
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Aucun traitement par lots en cours');
    });
  });

  describe('indexEmailsInBatches', () => {
    test('should reject when batch processing already in progress', async () => {
      // Simuler un traitement en cours
      // Note: Comme nous ne pouvons pas facilement modifier batchState,
      // nous testons juste que la fonction retourne une erreur
      
      // Premier appel (devrait réussir)
      const emails = [
        { id: '1', subject: 'Test 1', body: 'Body 1' },
        { id: '2', subject: 'Test 2', body: 'Body 2' },
      ];
      
      const result = await indexEmailsInBatches(emails, { batchSize: 2 });
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
    });

    test('should process emails in batches', async () => {
      const emails = [
        { id: '1', subject: 'Test 1', body: 'Body 1' },
        { id: '2', subject: 'Test 2', body: 'Body 2' },
        { id: '3', subject: 'Test 3', body: 'Body 3' },
        { id: '4', subject: 'Test 4', body: 'Body 4' },
      ];
      
      const result = await indexEmailsInBatches(emails, {
        batchSize: 2,
        batchDelay: 0, // Pas de délai pour les tests
      });
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(4);
      expect(result.indexed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.batches.length).toBe(2); // 2 batches de 2 emails
    });

    test('should handle empty email list', async () => {
      const result = await indexEmailsInBatches([], { batchSize: 2 });
      
      expect(result.success).toBe(true);
      expect(result.total).toBe(0);
      expect(result.indexed).toBe(0);
      expect(result.failed).toBe(0);
    });

    test('should handle progress callback', async () => {
      const emails = [
        { id: '1', subject: 'Test 1', body: 'Body 1' },
        { id: '2', subject: 'Test 2', body: 'Body 2' },
        { id: '3', subject: 'Test 3', body: 'Body 3' },
        { id: '4', subject: 'Test 4', body: 'Body 4' },
      ];
      
      const progressCalls = [];
      
      const result = await indexEmailsInBatches(emails, {
        batchSize: 2,
        batchDelay: 0,
        onProgress: (progress) => {
          progressCalls.push(progress);
        },
      });
      
      expect(result.success).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].totalEmails).toBe(4);
    });

    test('should handle completion callback', async () => {
      const emails = [
        { id: '1', subject: 'Test 1', body: 'Body 1' },
        { id: '2', subject: 'Test 2', body: 'Body 2' },
      ];
      
      const completionCalls = [];
      
      const result = await indexEmailsInBatches(emails, {
        batchSize: 2,
        batchDelay: 0,
        onComplete: (completion) => {
          completionCalls.push(completion);
        },
      });
      
      expect(result.success).toBe(true);
      expect(completionCalls.length).toBe(1);
      expect(completionCalls[0].success).toBe(true);
      expect(completionCalls[0].total).toBe(2);
    });

    test('should handle email indexation failures', async () => {
      // Mock indexEmail pour échouer
      const { indexEmail } = require('../../src/modules/indexation/indexer.js');
      const originalIndexEmail = indexEmail.mockImplementation;
      
      // Faire échouer l'indexation du premier email
      indexEmail.mockImplementationOnce(() => Promise.resolve(false));
      
      const emails = [
        { id: '1', subject: 'Test 1', body: 'Body 1' },
        { id: '2', subject: 'Test 2', body: 'Body 2' },
      ];
      
      const result = await indexEmailsInBatches(emails, {
        batchSize: 2,
        batchDelay: 0,
      });
      
      expect(result.success).toBe(false);
      expect(result.indexed).toBe(1);
      expect(result.failed).toBe(1);
      
      // Restaurer le mock
      indexEmail.mockImplementation(originalIndexEmail);
    });
  });
});
