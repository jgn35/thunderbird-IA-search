/**
 * Configuration par défaut pour l'extension Thunderbird RAG Search
 * @module config/defaultConfig
 */

/**
 * Configuration par défaut pour l'indexation
 * @typedef {Object} IndexationConfig
 * @property {string[]} excludedFolders - Liste des dossiers exclus de l'indexation (ex: ["Spam"])
 * @property {boolean} indexAttachments - Si vrai, les pièces jointes sont indexées
 * @property {number} maxEmailSize - Taille maximale des emails à indexer (en octets)
 */

/**
 * Configuration par défaut pour le RAG
 * @typedef {Object} RAGConfig
 * @property {'api_externe'|'local'} type - Type de LLM à utiliser
 * @property {Object} api - Configuration pour l'API externe (Mistral AI)
 * @property {string} api.endpoint - Endpoint de l'API
 * @property {string} api.apiKey - Clé API pour l'authentification
 * @property {Object} local - Configuration pour le LLM local (Ollama)
 * @property {string} local.url - URL du serveur Ollama
 * @property {string} local.model - Nom du modèle à utiliser
 */

/**
 * Configuration complète par défaut
 * @typedef {Object} DefaultConfig
 * @property {IndexationConfig} indexation - Configuration de l'indexation
 * @property {RAGConfig} rag - Configuration du RAG
 */

/**
 * Configuration par défaut de l'extension
 * @type {DefaultConfig}
 */
export const DEFAULT_CONFIG = {
  indexation: {
    excludedFolders: ["Spam"],
    indexAttachments: false,
    maxEmailSize: 10485760, // 10 Mo
  },
  rag: {
    type: "api_externe", // ou "local"
    api: {
      endpoint: "https://api.mistral.ai/v1",
      apiKey: "",
    },
    local: {
      url: "http://localhost:11434",
      model: "mistral-7b",
    },
  },
};

/**
 * Récupère la configuration par défaut
 * @returns {DefaultConfig} La configuration par défaut
 */
export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
