/**
 * Mock pour IndexedDB pour les tests Jest
 */

// Simuler IndexedDB dans un environnement Node.js
class MockIDBRequest {
  constructor() {
    this.onsuccess = null;
    this.onerror = null;
    this.result = null;
    this.error = null;
  }

  fireSuccess(result) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  fireError(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBObjectStore {
  constructor(name, options) {
    this.name = name;
    this.keyPath = options?.keyPath || null;
    this.autoIncrement = options?.autoIncrement || false;
    this.data = new Map();
    this.indexes = new Map();
  }

  createIndex(name, keyPath, options) {
    this.indexes.set(name, {
      name,
      keyPath,
      unique: options?.unique || false,
    });
  }

  put(value, key) {
    const request = new MockIDBRequest();
    const actualKey = key || (this.keyPath ? value[this.keyPath] : undefined);
    this.data.set(actualKey, value);
    request.fireSuccess(actualKey);
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    request.fireSuccess(this.data.get(key));
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    request.fireSuccess(Array.from(this.data.values()));
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    this.data.delete(key);
    request.fireSuccess(undefined);
    return request;
  }

  clear() {
    const request = new MockIDBRequest();
    this.data.clear();
    request.fireSuccess(undefined);
    return request;
  }

  count() {
    const request = new MockIDBRequest();
    request.fireSuccess(this.data.size);
    return request;
  }
}

class MockIDBTransaction {
  constructor(db, mode, storeNames) {
    this.db = db;
    this.mode = mode;
    this.storeNames = storeNames;
    this.objectStoreCache = new Map();
    this.oncomplete = null;
    this.onerror = null;
  }

  objectStore(name) {
    if (!this.objectStoreCache.has(name)) {
      const store = this.db.stores.get(name);
      if (!store) {
        throw new Error(`Object store ${name} not found`);
      }
      this.objectStoreCache.set(name, store);
    }
    return this.objectStoreCache.get(name);
  }

  fireComplete() {
    if (this.oncomplete) {
      this.oncomplete();
    }
  }

  fireError(error) {
    if (this.onerror) {
      this.onerror({ target: { error } });
    }
  }
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.stores = new Map();
    this.onclose = null;
    this.onabort = null;
    this.onversionchange = null;
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore(name, options);
    this.stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode) {
    const actualStoreNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, mode, actualStoreNames);
  }

  close() {
    if (this.onclose) {
      this.onclose();
    }
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
  }
}

// Mock global indexedDB
const indexedDB = {
  open: (name, version) => {
    const request = new MockIDBOpenDBRequest();
    const db = new MockIDBDatabase(name, version);
    
    // Simuler l'événement onupgradeneeded
    if (request.onupgradeneeded) {
      request.onupgradeneeded({
        target: { result: db },
        oldVersion: 0,
        newVersion: version,
      });
    }
    
    // Simuler le succès
    request.fireSuccess(db);
    return request;
  },

  deleteDatabase: (name) => {
    const request = new MockIDBRequest();
    request.fireSuccess(undefined);
    return request;
  },
};

// Mock pour browser.storage.local
const browser = {
  storage: {
    local: {
      data: {},
      get: async (keys) => {
        if (Array.isArray(keys)) {
          return keys.reduce((acc, key) => {
            acc[key] = browser.storage.local.data[key];
            return acc;
          }, {});
        }
        return { [keys]: browser.storage.local.data[keys] };
      },
      set: async (items) => {
        Object.assign(browser.storage.local.data, items);
      },
    },
  },
  messages: {
    list: async () => ({ messages: [], total: 0 }),
    getFull: async () => null,
    get: async () => null,
  },
  accounts: {
    list: async () => [],
  },
  folders: {
    list: async () => [],
    get: async () => ({ name: 'Test' }),
  },
  runtime: {
    onMessage: {
      addListener: () => {},
    },
  },
  downloads: {
    download: async () => {},
  },
};

// Exporter les mocks
global.indexedDB = indexedDB;
global.browser = browser;

module.exports = { indexedDB, browser };
