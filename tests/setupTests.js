/**
 * Configuration pour les tests Jest
 * Initialise les mocks pour IndexedDB et browser API
 */

// Charger les mocks
require('./__mocks__/indexedDB.js');

// Configuration supplémentaire si nécessaire
beforeAll(() => {
  // Initialiser les données de test
  global.browser.storage.local.data = {};
});

// Nettoyer après chaque test
beforeEach(() => {
  // Réinitialiser les données de stockage
  global.browser.storage.local.data = {};
});

// Nettoyer après tous les tests
afterAll(() => {
  // Réinitialiser complètement
  global.browser.storage.local.data = {};
});
