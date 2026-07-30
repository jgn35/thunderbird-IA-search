/**
 * Module de journalisation pour l'extension Thunderbird RAG Search
 * @module utils/logger
 */

import { addLog, getLogs, clearLogs } from '../config/storageManager.js';

/**
 * Niveaux de log disponibles
 * @typedef {'INFO'|'WARN'|'ERROR'} LogLevel
 */

/**
 * Journalise un message avec un niveau de gravité
 * @param {string} message - Le message à journaliser
 * @param {LogLevel} [level='INFO'] - Le niveau de gravité du log
 * @returns {Promise<void>}
 */
export async function log(message, level = 'INFO') {
  const logMessage = `[${level}] ${message}`;
  
  // Afficher dans la console
  switch (level) {
    case 'ERROR':
      console.error(logMessage);
      break;
    case 'WARN':
      console.warn(logMessage);
      break;
    default:
      console.log(logMessage);
  }

  // Ajouter au stockage persistant
  await addLog(logMessage);
}

/**
 * Journalise une erreur
 * @param {string|Error} error - L'erreur à journaliser
 * @param {string} [context=''] - Contexte supplémentaire
 * @returns {Promise<void>}
 */
export async function logError(error, context = '') {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
  await log(fullMessage, 'ERROR');
}

/**
 * Journalise un avertissement
 * @param {string} message - Le message d'avertissement
 * @param {string} [context=''] - Contexte supplémentaire
 * @returns {Promise<void>}
 */
export async function logWarn(message, context = '') {
  const fullMessage = context ? `${context}: ${message}` : message;
  await log(fullMessage, 'WARN');
}

/**
 * Journalise une information
 * @param {string} message - Le message d'information
 * @param {string} [context=''] - Contexte supplémentaire
 * @returns {Promise<void>}
 */
export async function logInfo(message, context = '') {
  const fullMessage = context ? `${context}: ${message}` : message;
  await log(fullMessage, 'INFO');
}

/**
 * Récupère tous les logs
 * @returns {Promise<string[]>} Liste des logs
 */
export async function getAllLogs() {
  return await getLogs();
}

/**
 * Efface tous les logs
 * @returns {Promise<void>}
 */
export async function clearAllLogs() {
  await clearLogs();
}

/**
 * Exporte les logs vers un fichier texte
 * @returns {Promise<void>}
 */
export async function exportLogsToFile() {
  const logs = await getAllLogs();
  const logContent = logs.join('\n');
  const blob = new Blob([logContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  try {
    await messenger.downloads.download({
      url: url,
      filename: `thunderbird_rag_logs_${new Date().toISOString().slice(0, 10)}.txt`,
      saveAs: true,
    });
  } catch (error) {
    await logError(error, 'Export des logs');
  } finally {
    URL.revokeObjectURL(url);
  }
}
