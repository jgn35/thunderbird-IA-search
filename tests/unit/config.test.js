/**
 * Tests unitaires pour la configuration
 */

import { getDefaultConfig, DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';

describe('Configuration par défaut', () => {
  describe('DEFAULT_CONFIG', () => {
    it('devrait avoir une structure valide', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });

    it('devrait avoir une configuration d\'indexation', () => {
      expect(DEFAULT_CONFIG.indexation).toBeDefined();
      expect(typeof DEFAULT_CONFIG.indexation).toBe('object');
      
      expect(DEFAULT_CONFIG.indexation.excludedFolders).toBeDefined();
      expect(Array.isArray(DEFAULT_CONFIG.indexation.excludedFolders)).toBe(true);
      expect(DEFAULT_CONFIG.indexation.excludedFolders).toContain('Spam');
      
      expect(DEFAULT_CONFIG.indexation.indexAttachments).toBeDefined();
      expect(typeof DEFAULT_CONFIG.indexation.indexAttachments).toBe('boolean');
      
      expect(DEFAULT_CONFIG.indexation.maxEmailSize).toBeDefined();
      expect(typeof DEFAULT_CONFIG.indexation.maxEmailSize).toBe('number');
      expect(DEFAULT_CONFIG.indexation.maxEmailSize).toBe(10485760); // 10 Mo
      
      expect(DEFAULT_CONFIG.indexation.chunkSize).toBeDefined();
      expect(DEFAULT_CONFIG.indexation.chunkSize).toBe(512);
      
      expect(DEFAULT_CONFIG.indexation.chunkOverlap).toBeDefined();
      expect(DEFAULT_CONFIG.indexation.chunkOverlap).toBe(100);
    });

    it('devrait avoir une configuration RAG', () => {
      expect(DEFAULT_CONFIG.rag).toBeDefined();
      expect(typeof DEFAULT_CONFIG.rag).toBe('object');
      
      expect(DEFAULT_CONFIG.rag.type).toBeDefined();
      expect(DEFAULT_CONFIG.rag.type).toBe('api_externe');
      
      expect(DEFAULT_CONFIG.rag.topK).toBeDefined();
      expect(DEFAULT_CONFIG.rag.topK).toBe(5);
      
      expect(DEFAULT_CONFIG.rag.temperature).toBeDefined();
      expect(DEFAULT_CONFIG.rag.temperature).toBe(0.7);
      
      // Configuration API
      expect(DEFAULT_CONFIG.rag.api).toBeDefined();
      expect(DEFAULT_CONFIG.rag.api.endpoint).toBe('https://api.mistral.ai/v1');
      expect(DEFAULT_CONFIG.rag.api.apiKey).toBe('');
      expect(DEFAULT_CONFIG.rag.api.embeddingEndpoint).toBe('https://api.mistral.ai/v1/embeddings');
      expect(DEFAULT_CONFIG.rag.api.model).toBe('mistral-embed');
      
      // Configuration locale (Ollama)
      expect(DEFAULT_CONFIG.rag.local).toBeDefined();
      expect(DEFAULT_CONFIG.rag.local.url).toBe('http://localhost:11434');
      expect(DEFAULT_CONFIG.rag.local.model).toBe('mistral-7b');
    });

    it('devrait avoir une configuration de débogage', () => {
      expect(DEFAULT_CONFIG.debug).toBeDefined();
      expect(typeof DEFAULT_CONFIG.debug).toBe('object');
      expect(DEFAULT_CONFIG.debug.enableDebugLogs).toBe(false);
    });

    it('devrait avoir des champs optionnels', () => {
      expect(DEFAULT_CONFIG.selectedFolders).toBeDefined();
      expect(Array.isArray(DEFAULT_CONFIG.selectedFolders)).toBe(true);
      expect(DEFAULT_CONFIG.selectedFolders).toEqual([]);
      
      expect(DEFAULT_CONFIG.lastIndexation).toBeNull();
    });
  });

  describe('getDefaultConfig', () => {
    it('devrait retourner une copie profonde de DEFAULT_CONFIG', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      // Modifier config1
      config1.indexation.maxEmailSize = 20000000;
      
      // config2 ne devrait pas être affecté
      expect(config2.indexation.maxEmailSize).toBe(10485760);
    });

    it('devrait retourner un objet différent à chaque appel', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).not.toBe(config2);
    });

    it('devrait avoir la même structure que DEFAULT_CONFIG', () => {
      const config = getDefaultConfig();
      
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });
});

describe('Validation de la configuration', () => {
  it('devrait valider une configuration complète', () => {
    const config = getDefaultConfig();
    
    // Ajouter des dossiers sélectionnés
    config.selectedFolders = ['folder1', 'folder2'];
    config.lastIndexation = new Date().toISOString();
    
    expect(config.indexation).toBeDefined();
    expect(config.rag).toBeDefined();
    expect(config.debug).toBeDefined();
    expect(Array.isArray(config.selectedFolders)).toBe(true);
  });

  it('devrait valider les valeurs numériques', () => {
    const config = getDefaultConfig();
    
    expect(typeof config.indexation.maxEmailSize).toBe('number');
    expect(config.indexation.maxEmailSize).toBeGreaterThan(0);
    
    expect(typeof config.indexation.chunkSize).toBe('number');
    expect(config.indexation.chunkSize).toBeGreaterThan(0);
    
    expect(typeof config.indexation.chunkOverlap).toBe('number');
    expect(config.indexation.chunkOverlap).toBeGreaterThanOrEqual(0);
    
    expect(typeof config.rag.topK).toBe('number');
    expect(config.rag.topK).toBeGreaterThan(0);
    
    expect(typeof config.rag.temperature).toBe('number');
    expect(config.rag.temperature).toBeGreaterThanOrEqual(0);
    expect(config.rag.temperature).toBeLessThanOrEqual(2);
  });

  it('devrait valider les valeurs booléennes', () => {
    const config = getDefaultConfig();
    
    expect(typeof config.indexation.indexAttachments).toBe('boolean');
    expect(typeof config.debug.enableDebugLogs).toBe('boolean');
  });

  it('devrait valider les chaînes de caractères', () => {
    const config = getDefaultConfig();
    
    expect(typeof config.rag.type).toBe('string');
    expect(['api_externe', 'local']).toContain(config.rag.type);
    
    expect(typeof config.rag.api.endpoint).toBe('string');
    expect(config.rag.api.endpoint.length).toBeGreaterThan(0);
    
    expect(typeof config.rag.local.url).toBe('string');
    expect(config.rag.local.url.length).toBeGreaterThan(0);
  });
});
