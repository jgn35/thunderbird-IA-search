/**
 * Module pour le prétraitement des requêtes de recherche
 * @module modules/recherche/queryProcessor
 */

import { cleanText } from '../../utils/helpers.js';
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Langues supportées pour la recherche
 * @type {string[]}
 */
const SUPPORTED_LANGUAGES = ['fr', 'en'];

/**
 * Dictionnaire de stop words pour le français
 * @type {Set<string>}
 */
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'à', 'au', 'aux',
  'par', 'pour', 'avec', 'sans', 'dans', 'sur', 'en', 'je', 'tu', 'il', 'elle',
  'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces', 'mon', 'ton', 'son',
  'notre', 'votre', 'leur', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'nos', 'vos',
  'leurs', 'qui', 'que', 'quoi', 'dont', 'où', 'quand', 'comment', 'pourquoi',
  'si', 'comme', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car', 'est', 'suis',
  'es', 'sommes', 'êtes', 'sont', 'ai', 'as', 'a', 'avons', 'avez', 'ont', 'avait',
  'avais', 'avions', 'aviez', 'avaient', 'sera', 'seras', 'sera', 'serons',
  'serez', 'seront', 'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
]);

/**
 * Dictionnaire de stop words pour l'anglais
 * @type {Set<string>}
 */
const ENGLISH_STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
  'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
  'just', 'don', 'should', 'now',
]);

/**
 * Détecte la langue d'une requête
 * @param {string} query - La requête à analyser
 * @returns {string} Le code de la langue détectée (ex: 'fr', 'en')
 */
export function detectLanguage(query) {
  if (!query || typeof query !== 'string') {
    return 'en'; // Par défaut, anglais
  }

  // Compter les mots dans chaque langue
  const cleanedQuery = cleanText(query).toLowerCase();
  const words = cleanedQuery.split(/\s+/);

  let frenchCount = 0;
  let englishCount = 0;

  for (const word of words) {
    if (FRENCH_STOP_WORDS.has(word)) {
      frenchCount++;
    }
    if (ENGLISH_STOP_WORDS.has(word)) {
      englishCount++;
    }
  }

  // Si plus de mots français, retourner 'fr'
  if (frenchCount > englishCount) {
    return 'fr';
  }

  // Sinon, retourner 'en'
  return 'en';
}

/**
 * Supprime les stop words d'une requête
 * @param {string} query - La requête à nettoyer
 * @param {string} [language] - La langue de la requête (auto-détectée si non spécifiée)
 * @returns {string} La requête sans stop words
 */
export function removeStopWords(query, language = null) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const detectedLanguage = language || detectLanguage(query);
  const stopWords = detectedLanguage === 'fr' ? FRENCH_STOP_WORDS : ENGLISH_STOP_WORDS;

  const cleanedQuery = cleanText(query).toLowerCase();
  const words = cleanedQuery.split(/\s+/);

  const filteredWords = words.filter(word => !stopWords.has(word));

  return filteredWords.join(' ');
}

/**
 * Normalise une requête pour la recherche
 * @param {string} query - La requête à normaliser
 * @returns {string} La requête normalisée
 */
export function normalizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Nettoyer le texte
  let normalized = cleanText(query);

  // Convertir en minuscules
  normalized = normalized.toLowerCase();

  // Supprimer les stop words
  normalized = removeStopWords(normalized);

  // Supprimer les ponctuations multiples
  normalized = normalized.replace(/[.,!?;:]+/g, ' ');

  // Supprimer les espaces multiples
  normalized = normalized.replace(/\s+/g, ' ');

  // Trim
  return normalized.trim();
}

/**
 * Vérifie si une requête est valide
 * @param {string} query - La requête à vérifier
 * @returns {boolean} Vrai si la requête est valide
 */
export function isValidQuery(query) {
  if (!query || typeof query !== 'string') {
    return false;
  }

  // Vérifier la longueur avant normalisation (pour éviter les problèmes avec les stop words)
  const cleaned = cleanText(query);
  if (cleaned.length < 2) {
    return false;
  }

  const normalized = normalizeQuery(query);
  return normalized.length >= 2; // Au moins 2 caractères
}

/**
 * Prétraite une requête pour la recherche
 * @param {string} query - La requête à prétraiter
 * @returns {Object} Objet contenant la requête prétraitée et sa langue
 * @property {string} processedQuery - La requête prétraitée
 * @property {string} language - La langue détectée
 * @property {boolean} isValid - Si la requête est valide
 */
export function processQuery(query) {
  try {
    const isValid = isValidQuery(query);
    
    if (!isValid) {
      return {
        processedQuery: '',
        language: 'en',
        isValid: false,
      };
    }

    const language = detectLanguage(query);
    const processedQuery = normalizeQuery(query);

    return {
      processedQuery,
      language,
      isValid: true,
    };
  } catch (error) {
    logError(error, 'Prétraitement de la requête');
    return {
      processedQuery: '',
      language: 'en',
      isValid: false,
    };
  }
}

/**
 * Extrait les mots-clés d'une requête
 * @param {string} query - La requête à analyser
 * @param {number} [maxKeywords=10] - Nombre maximal de mots-clés à retourner
 * @returns {string[]} Liste des mots-clés extraits
 */
export function extractKeywords(query, maxKeywords = 10) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const processed = processQuery(query);
  if (!processed.isValid) {
    return [];
  }

  const words = processed.processedQuery.split(/\s+/);
  return words.slice(0, maxKeywords);
}

/**
 * Récupère les stop words pour une langue donnée
 * @param {string} language - Le code de la langue
 * @returns {Set<string>} Les stop words pour la langue
 */
export function getStopWords(language) {
  switch (language) {
    case 'fr':
      return FRENCH_STOP_WORDS;
    case 'en':
      return ENGLISH_STOP_WORDS;
    default:
      return new Set();
  }
}

/**
 * Récupère les langues supportées
 * @returns {string[]} Liste des langues supportées
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}
