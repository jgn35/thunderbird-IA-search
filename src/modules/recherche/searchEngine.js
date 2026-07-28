/**
 * Module moteur de recherche pour l'extension Thunderbird RAG Search
 * @module modules/recherche/searchEngine
 */

import { searchEmails } from '../indexation/vectorStore.js';
import { processQuery, isValidQuery } from './queryProcessor.js';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Résultat de recherche
 * @typedef {Object} SearchResult
 * @property {string} id - ID du document dans le Vector Store
 * @property {string} emailId - ID de l'email dans Thunderbird
 * @property {string} subject - Sujet de l'email
 * @property {string} body - Corps de l'email
 * @property {string} from - Expéditeur
 * @property {string} to - Destinataire
 * @property {number} date - Date de l'email (timestamp)
 * @property {string} folderName - Nom du dossier
 * @property {number} lastModified - Date de dernière modification
 * @property {number} score - Score de pertinence
 */

/**
 * Résultat de la recherche avec contexte
 * @typedef {Object} SearchResponse
 * @property {boolean} success - Si la recherche a réussi
 * @property {string} query - La requête originale
 * @property {string} processedQuery - La requête prétraitée
 * @property {string} language - Langue détectée
 * @property {SearchResult[]} results - Liste des résultats
 * @property {number} totalResults - Nombre total de résultats
 * @property {string} [error] - Message d'erreur si applicable
 */

/**
 * Effectue une recherche dans les emails indexés
 * @param {string} query - La requête de recherche
 * @param {Object} [options] - Options de recherche
 * @param {number} [options.limit=5] - Nombre maximal de résultats
 * @param {string[]} [options.folders] - Filtre par dossiers
 * @param {Date} [options.fromDate] - Filtre par date de début
 * @param {Date} [options.toDate] - Filtre par date de fin
 * @returns {Promise<SearchResponse>} Les résultats de la recherche
 */
export async function search(query, options = {}) {
  const { limit = 5, folders = [], fromDate = null, toDate = null } = options;

  try {
    // Valider la requête
    if (!isValidQuery(query)) {
      await logWarn(`Requête invalide : "${query}"`);
      return {
        success: false,
        query,
        processedQuery: '',
        language: 'en',
        results: [],
        totalResults: 0,
        error: 'Requête invalide. Veuillez entrer au moins 2 caractères.',
      };
    }

    // Prétraiter la requête
    const { processedQuery, language, isValid } = processQuery(query);
    
    if (!isValid) {
      return {
        success: false,
        query,
        processedQuery: '',
        language: 'en',
        results: [],
        totalResults: 0,
        error: 'Requête invalide après prétraitement.',
      };
    }

    await logInfo(`Recherche : "${query}" (langue: ${language})`);

    // Effectuer la recherche dans le Vector Store
    let results = await searchEmails(processedQuery, limit);

    // Appliquer les filtres
    if (folders.length > 0) {
      results = results.filter(result => folders.includes(result.folderName));
    }

    if (fromDate) {
      const fromTimestamp = fromDate.getTime();
      results = results.filter(result => result.date >= fromTimestamp);
    }

    if (toDate) {
      const toTimestamp = toDate.getTime();
      results = results.filter(result => result.date <= toTimestamp);
    }

    // Trier par score (meilleur score en premier)
    results.sort((a, b) => a.score - b.score);

    await logInfo(`Recherche terminée : ${results.length} résultats pour "${query}"`);

    return {
      success: true,
      query,
      processedQuery,
      language,
      results,
      totalResults: results.length,
    };
  } catch (error) {
    await logError(error, `Recherche pour "${query}"`);
    return {
      success: false,
      query,
      processedQuery: '',
      language: 'en',
      results: [],
      totalResults: 0,
      error: error.message || 'Une erreur est survenue lors de la recherche.',
    };
  }
}

/**
 * Recherche avancée avec plusieurs critères
 * @param {Object} criteria - Critères de recherche
 * @param {string} criteria.query - Requête de recherche
 * @param {string[]} [criteria.folders] - Dossiers à inclure
 * @param {string[]} [criteria.excludedFolders] - Dossiers à exclure
 * @param {Date} [criteria.fromDate] - Date de début
 * @param {Date} [criteria.toDate] - Date de fin
 * @param {string} [criteria.from] - Expéditeur
 * @param {string} [criteria.to] - Destinataire
 * @param {number} [criteria.limit=5] - Limite de résultats
 * @returns {Promise<SearchResponse>} Résultats de la recherche
 */
export async function advancedSearch(criteria) {
  const {
    query,
    folders = [],
    excludedFolders = [],
    fromDate = null,
    toDate = null,
    from = null,
    to = null,
    limit = 5,
  } = criteria;

  try {
    // Valider la requête
    if (!isValidQuery(query)) {
      return {
        success: false,
        query,
        processedQuery: '',
        language: 'en',
        results: [],
        totalResults: 0,
        error: 'Requête invalide.',
      };
    }

    // Prétraiter la requête
    const { processedQuery, language, isValid } = processQuery(query);
    
    if (!isValid) {
      return {
        success: false,
        query,
        processedQuery: '',
        language: 'en',
        results: [],
        totalResults: 0,
        error: 'Requête invalide après prétraitement.',
      };
    }

    await logInfo(`Recherche avancée : "${query}"`);

    // Effectuer la recherche dans le Vector Store
    let results = await searchEmails(processedQuery, limit * 2); // Récupérer plus de résultats pour appliquer les filtres

    // Appliquer les filtres
    results = results.filter(result => {
      // Filtre par dossier
      if (folders.length > 0 && !folders.includes(result.folderName)) {
        return false;
      }
      
      if (excludedFolders.length > 0 && excludedFolders.includes(result.folderName)) {
        return false;
      }

      // Filtre par date
      if (fromDate && result.date < fromDate.getTime()) {
        return false;
      }
      
      if (toDate && result.date > toDate.getTime()) {
        return false;
      }

      // Filtre par expéditeur
      if (from && !result.from.toLowerCase().includes(from.toLowerCase())) {
        return false;
      }

      // Filtre par destinataire
      if (to && !result.to.toLowerCase().includes(to.toLowerCase())) {
        return false;
      }

      return true;
    });

    // Limiter les résultats
    results = results.slice(0, limit);

    // Trier par score
    results.sort((a, b) => a.score - b.score);

    await logInfo(`Recherche avancée terminée : ${results.length} résultats`);

    return {
      success: true,
      query,
      processedQuery,
      language,
      results,
      totalResults: results.length,
    };
  } catch (error) {
    await logError(error, `Recherche avancée pour "${query}"`);
    return {
      success: false,
      query,
      processedQuery: '',
      language: 'en',
      results: [],
      totalResults: 0,
      error: error.message || 'Une erreur est survenue lors de la recherche avancée.',
    };
  }
}

/**
 * Recherche par similarité sémantique (pour le RAG)
 * @param {string} query - La requête de recherche
 * @param {number} [limit=3] - Nombre de résultats pour le RAG
 * @returns {Promise<SearchResponse>} Résultats pour le RAG
 */
export async function semanticSearchForRAG(query, limit = 3) {
  try {
    // Effectuer une recherche simple avec une limite adaptée pour le RAG
    const result = await search(query, { limit });
    
    if (!result.success) {
      return result;
    }

    // Filtrer les résultats pour ne garder que les informations nécessaires au RAG
    const ragResults = result.results.map(r => ({
      id: r.id,
      emailId: r.emailId,
      subject: r.subject,
      body: r.body,
      from: r.from,
      to: r.to,
      date: r.date,
      folderName: r.folderName,
      score: r.score,
    }));

    return {
      ...result,
      results: ragResults,
    };
  } catch (error) {
    await logError(error, `Recherche sémantique pour RAG : "${query}"`);
    return {
      success: false,
      query,
      processedQuery: '',
      language: 'en',
      results: [],
      totalResults: 0,
      error: error.message || 'Erreur lors de la recherche sémantique.',
    };
  }
}

/**
 * Récupère les suggestions de recherche basées sur les emails indexés
 * @param {string} partialQuery - Requête partielle
 * @param {number} [limit=5] - Nombre de suggestions
 * @returns {Promise<string[]>} Liste de suggestions
 */
export async function getSearchSuggestions(partialQuery, limit = 5) {
  try {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    // Effectuer une recherche avec la requête partielle
    const result = await search(partialQuery, { limit });
    
    if (!result.success || result.results.length === 0) {
      return [];
    }

    // Extraire des suggestions à partir des sujets et corps des emails
    const suggestions = new Set();
    
    for (const email of result.results) {
      // Ajouter des mots-clés du sujet
      const subjectWords = email.subject.toLowerCase().split(/\s+/);
      subjectWords.forEach(word => {
        if (word.length >= 3 && word.startsWith(partialQuery.toLowerCase())) {
          suggestions.add(word);
        }
      });

      // Ajouter des mots-clés du corps (limité)
      const bodyWords = email.body.toLowerCase().split(/\s+/);
      bodyWords.slice(0, 20).forEach(word => {
        if (word.length >= 3 && word.startsWith(partialQuery.toLowerCase())) {
          suggestions.add(word);
        }
      });
    }

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    await logError(error, `Suggestions de recherche pour "${partialQuery}"`);
    return [];
  }
}
