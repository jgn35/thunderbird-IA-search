/**
 * Module principal d'indexation pour l'extension Thunderbird RAG Search
 * @module modules/indexation/indexer
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig, saveConfig } from '../../config/storageManager.js';
import { fetchEmailsForIndexation, fetchModifiedEmails, emailExists } from './emailFetcher.js';
import {
  initVectorStore,
  addOrUpdateEmail,
  deleteEmail,
  isEmailIndexed,
  getAllIndexedEmails,
  clearAllEmails,
  getStats,
} from './vectorStore.js';
import { extractMainBody } from '../../utils/helpers.js';
import { generateSingleEmbedding } from './embeddingService.js';

/**
 * État de l'indexation
 * @typedef {Object} IndexationState
 * @property {boolean} isIndexing - Si une indexation est en cours
 * @property {number} totalEmails - Nombre total d'emails à indexer
 * @property {number} processedEmails - Nombre d'emails traités
 * @property {number} indexedEmails - Nombre d'emails indexés
 * @property {number} skippedEmails - Nombre d'emails ignorés
 * @property {Date} lastIndexation - Date de la dernière indexation complète
 */

/**
 * État actuel de l'indexation
 * @type {IndexationState}
 */
let indexationState = {
  isIndexing: false,
  totalEmails: 0,
  processedEmails: 0,
  indexedEmails: 0,
  skippedEmails: 0,
  lastIndexation: null,
};

/**
 * Récupère l'état actuel de l'indexation
 * @returns {IndexationState} L'état de l'indexation
 */
export function getIndexationState() {
  return { ...indexationState };
}

/**
 * Met à jour l'état de l'indexation
 * @param {Partial<IndexationState>} updates - Les mises à jour à appliquer
 */
function updateIndexationState(updates) {
  indexationState = { ...indexationState, ...updates };
}

/**
 * Initialise le module d'indexation
 * @returns {Promise<void>}
 */
export async function initIndexer() {
  try {
    await initVectorStore();
    await logInfo('Module d\'indexation initialisé');
  } catch (error) {
    await logError(error, 'Initialisation du module d\'indexation');
    throw error;
  }
}

/**
 * Indexe un email unique
 * @param {Object} emailData - Les données de l'email à indexer
 * @returns {Promise<boolean>} Vrai si l'email a été indexé avec succès
 */
export async function indexEmail(emailData) {
  try {
    const { id, body, subject, from, to, date, folderName, lastModified } = emailData;
    
    // Vérifier si l'email existe toujours
    const exists = await emailExists(id);
    if (!exists) {
      await logWarn(`Email ${id} n'existe plus, indexation annulée`);
      return false;
    }

    // Extraire le corps principal (sans citations, signatures, etc.)
    const cleanedBody = extractMainBody(body);

    // Créer les données à indexer
    const dataToIndex = {
      id,
      emailId: id,
      subject,
      body: cleanedBody,
      from,
      to,
      date,
      folderName,
      lastModified,
    };

    // Vérifier si l'email est déjà indexé
    const alreadyIndexed = await isEmailIndexed(id, lastModified);
    
    if (alreadyIndexed) {
      await logInfo(`Email ${id} déjà indexé, mise à jour`);
    }

    // Ajouter ou mettre à jour dans le Vector Store
    await addOrUpdateEmail(dataToIndex);
    
    await logInfo(`Email indexé : ${id} (${subject})`);
    return true;
  } catch (error) {
    await logError(error, `Indexation de l'email ${emailData.id}`);
    return false;
  }
}

/**
 * Supprime un email de l'index
 * @param {string} emailId - L'ID de l'email à supprimer
 * @param {number} [lastModified] - Date de dernière modification
 * @returns {Promise<boolean>} Vrai si la suppression a réussi
 */
export async function unindexEmail(emailId, lastModified = null) {
  try {
    await deleteEmail(emailId, lastModified);
    await logInfo(`Email désindexé : ${emailId}`);
    return true;
  } catch (error) {
    await logError(error, `Désindexation de l'email ${emailId}`);
    return false;
  }
}

/**
 * Indexe tous les emails des dossiers sélectionnés
 * @param {string[]} selectedFolderIds - Liste des IDs des dossiers à indexer
 * @param {Object} [config] - Configuration de l'indexation
 * @returns {Promise<Object>} Statistiques de l'indexation
 */
export async function indexAllEmails(selectedFolderIds, config = null) {
  if (indexationState.isIndexing) {
    await logWarn('Une indexation est déjà en cours');
    return {
      success: false,
      message: 'Indexation déjà en cours',
    };
  }

  updateIndexationState({
    isIndexing: true,
    totalEmails: 0,
    processedEmails: 0,
    indexedEmails: 0,
    skippedEmails: 0,
  });

  try {
    await logInfo(`Début de l'indexation complète pour ${selectedFolderIds.length} dossiers`);

    // Vérifier la configuration des embeddings
    const currentConfig = config || await getConfig();
    const embeddingConfig = currentConfig.rag?.api;
    
    if (!embeddingConfig || !embeddingConfig.apiKey || embeddingConfig.apiKey.trim() === '') {
      await logWarn('Aucune clé API Mistral configurée. Utilisation de la recherche par mots-clés uniquement.');
    }

    // Récupérer les emails à indexer
    const emails = await fetchEmailsForIndexation(selectedFolderIds, config);
    
    updateIndexationState({
      totalEmails: emails.length,
    });

    await logInfo(`Récupération terminée : ${emails.length} emails à traiter`);

    // Indexer chaque email
    for (const email of emails) {
      updateIndexationState({
        processedEmails: indexationState.processedEmails + 1,
      });

      const success = await indexEmail(email);
      if (success) {
        updateIndexationState({
          indexedEmails: indexationState.indexedEmails + 1,
        });
      } else {
        updateIndexationState({
          skippedEmails: indexationState.skippedEmails + 1,
        });
      }
    }

    // Mettre à jour la date de la dernière indexation
    updateIndexationState({
      lastIndexation: new Date(),
    });

    // Sauvegarder la date de la dernière indexation dans la config
    const currentConfigForSave = config || await getConfig();
    await saveConfig({
      ...currentConfigForSave,
      lastIndexation: new Date().toISOString(),
    });

    await logInfo(`Indexation complète terminée : ${indexationState.indexedEmails}/${indexationState.totalEmails} emails indexés`);

    updateIndexationState({
      isIndexing: false,
    });

    return {
      success: true,
      total: indexationState.totalEmails,
      indexed: indexationState.indexedEmails,
      skipped: indexationState.skippedEmails,
      lastIndexation: indexationState.lastIndexation,
    };
  } catch (error) {
    await logError(error, 'Indexation complète des emails');
    updateIndexationState({
      isIndexing: false,
    });
    return {
      success: false,
      error: error.message,
      total: indexationState.totalEmails,
      indexed: indexationState.indexedEmails,
      skipped: indexationState.skippedEmails,
    };
  }
}

/**
 * Indexe uniquement les emails modifiés depuis la dernière indexation
 * @param {string[]} selectedFolderIds - Liste des IDs des dossiers à indexer
 * @param {Object} [config] - Configuration de l'indexation
 * @returns {Promise<Object>} Statistiques de l'indexation incrémentale
 */
export async function indexModifiedEmails(selectedFolderIds, config = null) {
  if (indexationState.isIndexing) {
    await logWarn('Une indexation est déjà en cours');
    return {
      success: false,
      message: 'Indexation déjà en cours',
    };
  }

  updateIndexationState({
    isIndexing: true,
    totalEmails: 0,
    processedEmails: 0,
    indexedEmails: 0,
    skippedEmails: 0,
  });

  try {
    const currentConfig = config || await getConfig();
    const lastIndexation = currentConfig.lastIndexation || new Date(0).toISOString();

    await logInfo(`Début de l'indexation incrémentale depuis le ${new Date(lastIndexation).toISOString()}`);

    // Récupérer les emails modifiés
    const emails = await fetchModifiedEmails(selectedFolderIds, lastIndexation, config);
    
    updateIndexationState({
      totalEmails: emails.length,
    });

    await logInfo(`Récupération terminée : ${emails.length} emails modifiés à traiter`);

    // Indexer chaque email modifié
    for (const email of emails) {
      updateIndexationState({
        processedEmails: indexationState.processedEmails + 1,
      });

      const success = await indexEmail(email);
      if (success) {
        updateIndexationState({
          indexedEmails: indexationState.indexedEmails + 1,
        });
      } else {
        updateIndexationState({
          skippedEmails: indexationState.skippedEmails + 1,
        });
      }
    }

    // Mettre à jour la date de la dernière indexation
    updateIndexationState({
      lastIndexation: new Date(),
    });

    // Sauvegarder la date de la dernière indexation dans la config
    await saveConfig({
      ...currentConfig,
      lastIndexation: new Date().toISOString(),
    });

    await logInfo(`Indexation incrémentale terminée : ${indexationState.indexedEmails}/${indexationState.totalEmails} emails mis à jour`);

    updateIndexationState({
      isIndexing: false,
    });

    return {
      success: true,
      total: indexationState.totalEmails,
      indexed: indexationState.indexedEmails,
      skipped: indexationState.skippedEmails,
      lastIndexation: indexationState.lastIndexation,
    };
  } catch (error) {
    await logError(error, 'Indexation incrémentale des emails');
    updateIndexationState({
      isIndexing: false,
    });
    return {
      success: false,
      error: error.message,
      total: indexationState.totalEmails,
      indexed: indexationState.indexedEmails,
      skipped: indexationState.skippedEmails,
    };
  }
}

/**
 * Supprime tous les emails indexés
 * @returns {Promise<Object>} Résultat de la suppression
 */
export async function clearIndex() {
  try {
    await clearAllEmails();
    await logInfo('Tous les emails ont été supprimés de l\'index');
    
    // Réinitialiser l'état de l'indexation
    updateIndexationState({
      totalEmails: 0,
      processedEmails: 0,
      indexedEmails: 0,
      skippedEmails: 0,
      lastIndexation: null,
    });

    return {
      success: true,
      message: 'Index vidé avec succès',
    };
  } catch (error) {
    await logError(error, 'Vidage de l\'index');
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Récupère les statistiques de l'index
 * @returns {Promise<Object>} Statistiques de l'index
 */
export async function getIndexStats() {
  try {
    const stats = await getStats();
    return {
      totalIndexed: stats.totalEmails,
      lastIndexation: indexationState.lastIndexation,
      isIndexing: indexationState.isIndexing,
    };
  } catch (error) {
    await logError(error, 'Récupération des statistiques de l\'index');
    return {
      totalIndexed: 0,
      lastIndexation: null,
      isIndexing: indexationState.isIndexing,
    };
  }
}

/**
 * Vérifie si un email spécifique est indexé
 * @param {string} emailId - L'ID de l'email
 * @param {number} [lastModified] - Date de dernière modification
 * @returns {Promise<boolean>} Vrai si l'email est indexé
 */
export async function checkEmailIndexed(emailId, lastModified = null) {
  return await isEmailIndexed(emailId, lastModified);
}

/**
 * Vérifie la configuration des embeddings
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function checkEmbeddingConfig() {
  const config = await getConfig();
  const apiConfig = config.rag?.api || {};
  
  const isValid = apiConfig.endpoint && apiConfig.endpoint.trim() !== '' &&
    apiConfig.apiKey && apiConfig.apiKey.trim() !== '';

  return {
    isValid,
    error: isValid ? null : 'Configuration API Mistral invalide pour les embeddings.',
    details: {
      endpoint: apiConfig.endpoint || '',
      hasApiKey: !!apiConfig.apiKey,
    },
  };
}
