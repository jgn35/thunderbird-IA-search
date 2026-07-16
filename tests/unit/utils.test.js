/**
 * Tests unitaires pour les utilitaires
 */

import {
  log,
  logError,
  logWarn,
  logInfo,
  getAllLogs,
  clearAllLogs,
} from '../../src/utils/logger.js';

// Mock browser.storage.local
const mockStorage = {};
browser.storage.local = {
  get: jest.fn().mockImplementation((keys) => {
    if (Array.isArray(keys)) {
      return Promise.resolve(keys.reduce((obj, key) => {
        obj[key] = mockStorage[key] || null;
        return obj;
      }, {}));
    }
    return Promise.resolve(mockStorage[keys] || {});
  }),
  set: jest.fn().mockImplementation((data) => {
    Object.assign(mockStorage, data);
    return Promise.resolve();
  }),
};

describe('Utils - Logger', () => {
  beforeEach(async () => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    await clearAllLogs();
  });

  describe('log', () => {
    test('should log INFO message', async () => {
      await log('Test message', 'INFO');
      const logs = await getAllLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('[INFO]');
      expect(logs[0]).toContain('Test message');
    });

    test('should log WARN message', async () => {
      await log('Warning message', 'WARN');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[WARN]');
      expect(logs[0]).toContain('Warning message');
    });

    test('should log ERROR message', async () => {
      await log('Error message', 'ERROR');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('Error message');
    });

    test('should default to INFO level', async () => {
      await log('Default message');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[INFO]');
    });
  });

  describe('logError', () => {
    test('should log Error object', async () => {
      const error = new Error('Test error');
      await logError(error);
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('Test error');
    });

    test('should log string error', async () => {
      await logError('String error');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[ERROR]');
      expect(logs[0]).toContain('String error');
    });

    test('should include context', async () => {
      await logError('Test error', 'TestContext');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('TestContext:');
    });
  });

  describe('logWarn', () => {
    test('should log warning message', async () => {
      await logWarn('Warning message');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[WARN]');
      expect(logs[0]).toContain('Warning message');
    });

    test('should include context', async () => {
      await logWarn('Warning message', 'TestContext');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('TestContext:');
    });
  });

  describe('logInfo', () => {
    test('should log info message', async () => {
      await logInfo('Info message');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('[INFO]');
      expect(logs[0]).toContain('Info message');
    });

    test('should include context', async () => {
      await logInfo('Info message', 'TestContext');
      const logs = await getAllLogs();
      expect(logs[0]).toContain('TestContext:');
    });
  });

  describe('getAllLogs', () => {
    test('should return all logs', async () => {
      await log('Message 1');
      await log('Message 2');
      const logs = await getAllLogs();
      expect(logs.length).toBe(2);
    });

    test('should return empty array when no logs', async () => {
      const logs = await getAllLogs();
      expect(logs).toEqual([]);
    });
  });

  describe('clearAllLogs', () => {
    test('should clear all logs', async () => {
      await log('Message 1');
      await log('Message 2');
      await clearAllLogs();
      const logs = await getAllLogs();
      expect(logs.length).toBe(0);
    });
  });
});
