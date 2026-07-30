/**
 * Gestionnaire de stockage pour les paramètres de l'extension
 * Utilise l'API messenger.storage.local de Thunderbird
 * @module config/storageManager
 */

import { getDefaultConfig } from './defaultConfig.js';

/**
 * Clé de stockage pour la configuration
 * @type {string}
 */
const STORAGE_KEY = 'ragExtensionConfig';

/**
 * Clé de stockage pour les logs
 * @type {string}
 */
const LOGS_KEY = 'ragExtensionLogs';

/**
 * Récupère la configuration actuelle ou la configuration par défaut si aucune n'existe
 * @returns {Promise<Object>} La configuration actuelle
 */
export async function getConfig() {
  try {
    const result = await messenger.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return result[STORAGE_KEY];
    }
    // Si aucune configuration n'existe, sauvegarder et retourner la configuration par défaut
    const defaultConfig = getDefaultConfig();
    await saveConfig(defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    return getDefaultConfig();
  }
}

/**
 * Sauvegarde la configuration
 * @param {Object} config - La configuration à sauvegarder
 * @returns {Promise<void>}
 */
export async function saveConfig(config) {
  try {
    await messenger.storage.local.set({ [STORAGE_KEY]: config });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error);
    throw error;
  }
}

/**
 * Met à jour une partie de la configuration
 * @param {Object} updates - Les mises à jour à appliquer
 * @returns {Promise<Object>} La configuration mise à jour
 */
export async function updateConfig(updates) {
  const currentConfig = await getConfig();
  const newConfig = { ...currentConfig, ...updates };
  await saveConfig(newConfig);
  return newConfig;
}

/**
 * Réinitialise la configuration aux valeurs par défaut
 * @returns {Promise<Object>} La configuration par défaut
 */
export async function resetConfig() {
  const defaultConfig = getDefaultConfig();
  await saveConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Récupère les logs
 * @returns {Promise<string[]>} Liste des logs
 */
export async function getLogs() {
  try {
    const result = await messenger.storage.local.get(LOGS_KEY);
    return result[LOGS_KEY] || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    return [];
  }
}

/**
 * Ajoute un log
 * @param {string} message - Le message de log à ajouter
 * @returns {Promise<void>}
 */
export async function addLog(message) {
  try {
    const logs = await getLogs();
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
    // Garder seulement les 1000 derniers logs pour éviter de saturer le stockage
    const trimmedLogs = logs.slice(-1000);
    await messenger.storage.local.set({ [LOGS_KEY]: trimmedLogs });
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un log:', error);
  }
}

/**
 * Efface tous les logs
 * @returns {Promise<void>}
 */
export async function clearLogs() {
  try {
    await messenger.storage.local.set({ [LOGS_KEY]: [] });
  } catch (error) {
    console.error('Erreur lors de l\'effacement des logs:', error);
  }
}
