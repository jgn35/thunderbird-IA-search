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
 * @property {number} [chunkSize] - Taille des chunks en tokens
 * @property {number} [chunkOverlap] - Recouvrement des chunks en tokens
 */

/**
 * Configuration par défaut pour le RAG
 * @typedef {Object} RAGConfig
 * @property {'api_externe'|'local'} type - Type de LLM à utiliser
 * @property {Object} api - Configuration pour l'API externe (Mistral AI)
 * @property {string} api.endpoint - Endpoint de l'API
 * @property {string} api.apiKey - Clé API pour l'authentification
 * @property {string} [api.embeddingEndpoint] - Endpoint pour les embeddings (optionnel)
 * @property {string} [api.model] - Modèle à utiliser pour l'API
 * @property {Object} local - Configuration pour le LLM local (Ollama)
 * @property {string} local.url - URL du serveur Ollama
 * @property {string} local.model - Nom du modèle à utiliser
 * @property {number} [topK] - Nombre de résultats à retourner
 * @property {number} [temperature] - Température pour la génération
 */

/**
 * Configuration par défaut pour le débogage
 * @typedef {Object} DebugConfig
 * @property {boolean} enableDebugLogs - Activer les logs de débogage
 */

/**
 * Configuration complète par défaut
 * @typedef {Object} DefaultConfig
 * @property {IndexationConfig} indexation - Configuration de l'indexation
 * @property {RAGConfig} rag - Configuration du RAG
 * @property {DebugConfig} [debug] - Configuration du débogage
 * @property {string[]} [selectedFolders] - Dossiers sélectionnés pour l'indexation
 * @property {string} [lastIndexation] - Date de la dernière indexation
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
    chunkSize: 512, // tokens
    chunkOverlap: 100, // tokens
  },
  rag: {
    type: "api_externe", // ou "local"
    topK: 5,
    temperature: 0.7,
    api: {
      endpoint: "https://api.mistral.ai/v1",
      apiKey: "",
      embeddingEndpoint: "https://api.mistral.ai/v1/embeddings",
      model: "mistral-tiny",
    },
    local: {
      url: "http://localhost:11434",
      model: "mistral-7b",
    },
  },
  debug: {
    enableDebugLogs: false,
  },
  selectedFolders: [],
  lastIndexation: null,
};

/**
 * Récupère la configuration par défaut
 * @returns {DefaultConfig} La configuration par défaut
 */
export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
