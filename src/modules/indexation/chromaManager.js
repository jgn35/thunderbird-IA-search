/**
 * Module pour la gestion du stockage vectoriel
 * Utilise IndexedDB comme backend (anciennement ChromaDB)
 * @module modules/indexation/chromaManager
 * @deprecated Utiliser vectorStore.js à la place
 */

// Redirige vers le nouveau module vectorStore
import {
  initVectorStore as initChromaClient,
  getEmailCollection,
  addOrUpdateEmail,
  deleteEmail,
  isEmailIndexed,
  searchEmails,
  getAllIndexedEmails,
  clearAllEmails,
  closeVectorStore as closeChromaClient,
  deleteDatabase,
  getStats,
} from './vectorStore.js';

// Exporter toutes les fonctions du nouveau module
export {
  initChromaClient,
  getEmailCollection,
  addOrUpdateEmail,
  deleteEmail,
  isEmailIndexed,
  searchEmails,
  getAllIndexedEmails,
  clearAllEmails,
  closeChromaClient,
  deleteDatabase,
  getStats,
};

// Message de dépréciation
console.warn(
  'Le module chromaManager.js est déprécié. ' +
  'Utilisez vectorStore.js à la place pour une meilleure compatibilité avec les extensions Thunderbird.'
);
