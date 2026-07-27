/**
 * Service de traitement par lots pour l'indexation
 * Permet d'indexer de grands volumes d'emails de manière efficace
 * @module modules/indexation/batchProcessor
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';
import { indexEmail, getIndexationState } from './indexer.js';
import { generateEmbeddingsBatch } from './embeddingService.js';

/**
 * Taille par défaut des batches
 * @type {number}
 */
const DEFAULT_BATCH_SIZE = 50;

/**
 * Délai entre les batches (en ms)
 * @type {number}
 */
const DEFAULT_BATCH_DELAY = 100;

/**
 * Temps maximum pour un batch (en ms)
 * @type {number}
 */
const DEFAULT_BATCH_TIMEOUT = 120000; // 2 minutes

/**
 * État du traitement par lots
 * @typedef {Object} BatchState
 * @property {boolean} isProcessing - Si un traitement par lots est en cours
 * @property {number} totalBatches - Nombre total de batches
 * @property {number} processedBatches - Nombre de batches traités
 * @property {number} totalEmails - Nombre total d'emails
 * @property {number} processedEmails - Nombre d'emails traités
 * @property {number} failedEmails - Nombre d'emails échoués
 * @property {Date} startTime - Date de début du traitement
 */

/**
 * État actuel du traitement par lots
 * @type {BatchState}
 */
let batchState = {
  isProcessing: false,
  totalBatches: 0,
  processedBatches: 0,
  totalEmails: 0,
  processedEmails: 0,
  failedEmails: 0,
  startTime: null,
};

/**
 * Récupère l'état actuel du traitement par lots
 * @returns {BatchState} L'état du traitement par lots
 */
export function getBatchState() {
  return { ...batchState };
}

/**
 * Met à jour l'état du traitement par lots
 * @param {Partial<BatchState>} updates - Les mises à jour à appliquer
 */
function updateBatchState(updates) {
  batchState = { ...batchState, ...updates };
}

/**
 * Traite un batch d'emails
 * @param {Array} emailBatch - Batch d'emails à indexer
 * @param {number} batchIndex - Index du batch
 * @param {number} totalBatches - Nombre total de batches
 * @returns {Promise<Object>} Résultat du traitement du batch
 */
async function processBatch(emailBatch, batchIndex, totalBatches) {
  const batchStartTime = Date.now();
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    await logInfo(`Traitement du batch ${batchIndex + 1}/${totalBatches} (${emailBatch.length} emails)`);

    // Générer les embeddings pour le batch
    const texts = emailBatch.map(email => `${email.subject}\n${email.body}`);
    const embeddingResult = await generateEmbeddingsBatch(texts, DEFAULT_BATCH_SIZE);

    if (!embeddingResult.success) {
      await logWarn(`Échec de la génération des embeddings pour le batch ${batchIndex + 1}: ${embeddingResult.errors.join(', ')}`);
      // Continuer avec l'indexation sans embeddings
    }

    // Indexer chaque email du batch
    for (let i = 0; i < emailBatch.length; i++) {
      const email = emailBatch[i];
      
      try {
        // Si les embeddings ont été générés, les ajouter à l'email
        if (embeddingResult.success && embeddingResult.embeddings[i]) {
          email.embedding = embeddingResult.embeddings[i];
        }

        const success = await indexEmail(email);
        if (success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Échec de l'indexation de l'email ${email.id}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Erreur lors de l'indexation de l'email ${email.id}: ${error.message}`);
        await logError(error, `Indexation de l'email ${email.id} (batch ${batchIndex + 1})`);
      }
    }

    const batchDuration = Date.now() - batchStartTime;
    await logInfo(`Batch ${batchIndex + 1} terminé: ${results.success} réussis, ${results.failed} échoués (${batchDuration}ms)`);

    return results;
  } catch (error) {
    await logError(error, `Traitement du batch ${batchIndex + 1}`);
    return {
      success: 0,
      failed: emailBatch.length,
      errors: [`Erreur du batch: ${error.message}`],
    };
  }
}

/**
 * Indexe des emails par lots
 * @param {Array} emails - Tableau d'emails à indexer
 * @param {Object} [options] - Options supplémentaires
 * @param {number} [options.batchSize=50] - Taille de chaque batch
 * @param {number} [options.batchDelay=100] - Délai entre les batches (en ms)
 * @param {Function} [options.onProgress] - Callback de progression
 * @param {Function} [options.onComplete] - Callback de complétion
 * @returns {Promise<Object>} Résultat du traitement par lots
 */
export async function indexEmailsInBatches(emails, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    batchDelay = DEFAULT_BATCH_DELAY,
    onProgress = null,
    onComplete = null,
  } = options;

  if (batchState.isProcessing) {
    await logWarn('Un traitement par lots est déjà en cours');
    return {
      success: false,
      message: 'Traitement par lots déjà en cours',
    };
  }

  updateBatchState({
    isProcessing: true,
    totalBatches: Math.ceil(emails.length / batchSize),
    processedBatches: 0,
    totalEmails: emails.length,
    processedEmails: 0,
    failedEmails: 0,
    startTime: new Date(),
  });

  try {
    await logInfo(`Début du traitement par lots de ${emails.length} emails (batch size: ${batchSize})`);

    const allResults = {
      success: 0,
      failed: 0,
      errors: [],
      batches: [],
    };

    // Diviser les emails en batches
    const batches = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    // Traiter chaque batch
    for (let i = 0; i < batches.length; i++) {
      // Vérifier si le traitement a été annulé
      if (!batchState.isProcessing) {
        break;
      }

      const batchResult = await processBatch(batches[i], i, batches.length);
      
      allResults.success += batchResult.success;
      allResults.failed += batchResult.failed;
      allResults.errors.push(...batchResult.errors);
      allResults.batches.push(batchResult);

      updateBatchState({
        processedBatches: i + 1,
        processedEmails: allResults.success + allResults.failed,
        failedEmails: allResults.failed,
      });

      // Appeler le callback de progression
      if (onProgress) {
        try {
          onProgress({
            currentBatch: i + 1,
            totalBatches: batches.length,
            processedEmails: allResults.success + allResults.failed,
            totalEmails: emails.length,
            success: allResults.success,
            failed: allResults.failed,
          });
        } catch (error) {
          await logError(error, 'Callback de progression');
        }
      }

      // Délai entre les batches (sauf pour le dernier)
      if (i < batches.length - 1 && batchDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }

    const totalDuration = Date.now() - batchState.startTime.getTime();
    
    updateBatchState({
      isProcessing: false,
    });

    await logInfo(`Traitement par lots terminé: ${allResults.success}/${emails.length} emails indexés, ${allResults.failed} échoués (${totalDuration}ms)`);

    // Appeler le callback de complétion
    if (onComplete) {
      try {
        onComplete({
          success: allResults.success === emails.length,
          total: emails.length,
          indexed: allResults.success,
          failed: allResults.failed,
          errors: allResults.errors,
          duration: totalDuration,
        });
      } catch (error) {
        await logError(error, 'Callback de complétion');
      }
    }

    return {
      success: allResults.success === emails.length,
      total: emails.length,
      indexed: allResults.success,
      failed: allResults.failed,
      errors: allResults.errors,
      batches: allResults.batches,
      duration: totalDuration,
    };
  } catch (error) {
    await logError(error, 'Traitement par lots des emails');
    updateBatchState({
      isProcessing: false,
    });
    return {
      success: false,
      error: error.message,
      total: emails.length,
      indexed: batchState.processedEmails - batchState.failedEmails,
      failed: batchState.failedEmails,
      duration: Date.now() - batchState.startTime.getTime(),
    };
  }
}

/**
 * Annule le traitement par lots en cours
 * @returns {Promise<Object>} Résultat de l'annulation
 */
export async function cancelBatchProcessing() {
  if (!batchState.isProcessing) {
    return {
      success: false,
      message: 'Aucun traitement par lots en cours',
    };
  }

  updateBatchState({
    isProcessing: false,
  });

  await logInfo('Traitement par lots annulé par l\'utilisateur');

  return {
    success: true,
    message: 'Traitement par lots annulé',
  };
}

/**
 * Estime le temps restant pour le traitement par lots
 * @param {number} processedEmails - Nombre d'emails déjà traités
 * @param {number} totalEmails - Nombre total d'emails
 * @param {number} startTime - Date de début
 * @returns {Object} Estimation du temps restant
 */
export function estimateRemainingTime(processedEmails, totalEmails, startTime) {
  if (processedEmails <= 0 || startTime === null) {
    return {
      remainingTime: null,
      estimatedCompletion: null,
      emailsPerSecond: 0,
    };
  }

  const elapsedTime = Date.now() - startTime.getTime();
  const emailsPerSecond = processedEmails / (elapsedTime / 1000);
  const remainingEmails = totalEmails - processedEmails;
  const remainingTime = remainingEmails / emailsPerSecond * 1000;
  const estimatedCompletion = new Date(Date.now() + remainingTime);

  return {
    remainingTime: Math.round(remainingTime),
    estimatedCompletion,
    emailsPerSecond: Math.round(emailsPerSecond * 100) / 100,
  };
}

/**
 * Récupère le temps écoulé depuis le début du traitement
 * @returns {number|null} Temps écoulé en ms ou null si aucun traitement en cours
 */
export function getElapsedTime() {
  if (!batchState.startTime) {
    return null;
  }
  return Date.now() - batchState.startTime.getTime();
}
