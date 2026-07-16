/**
 * Fonctions utilitaires pour l'extension Thunderbird RAG Search
 * @module utils/helpers
 */

/**
 * Génère un hash pour un email basé sur son ID et sa date de modification
 * @param {string} emailId - L'ID de l'email
 * @param {number|string} lastModified - La date de dernière modification
 * @returns {string} Le hash généré
 */
export function generateEmailHash(emailId, lastModified) {
  const data = `${emailId}:${lastModified}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32 bits
  }
  return `email_${Math.abs(hash).toString(16)}`;
}

/**
 * Nettoie le texte en supprimant les balises HTML et les caractères spéciaux
 * @param {string} text - Le texte à nettoyer
 * @returns {string} Le texte nettoyé
 */
export function cleanText(text) {
  if (!text) return '';
  
  // Supprimer les balises HTML
  let cleaned = text.replace(/<[^>]*>/g, ' ');
  
  // Supprimer les espaces multiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Supprimer les caractères de contrôle
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Trim
  return cleaned.trim();
}

/**
 * Vérifie si un email dépasse la taille maximale autorisée
 * @param {string} emailContent - Le contenu de l'email
 * @param {number} maxSize - La taille maximale en octets
 * @returns {boolean} Vrai si l'email est trop grand
 */
export function isEmailTooLarge(emailContent, maxSize) {
  if (!emailContent) return false;
  const size = new Blob([emailContent]).size;
  return size > maxSize;
}

/**
 * Extrait le corps du texte d'un email (supprime les citations et signatures)
 * @param {string} body - Le corps de l'email
 * @returns {string} Le corps nettoyé
 */
export function extractMainBody(body) {
  if (!body) return '';
  
  let cleaned = cleanText(body);
  
  // Supprimer les citations (ex: "Le 12/01/2024, John Doe a écrit :")
  cleaned = cleaned.replace(/Le \d{2}\/\d{2}\/\d{4}, .* a écrit :/gi, '');
  cleaned = cleaned.replace(/On \w+, \w+ \d+, \d+ at \d+:\d+ [AP]M, .* wrote:/gi, '');
  
  // Supprimer les signatures (ex: "--\nJohn Doe")
  cleaned = cleaned.replace(/--\s*\n.*$/s, '');
  
  // Supprimer les lignes de réponse (ex: "> Le 12/01/2024...")
  cleaned = cleaned.replace(/^>.*$/gm, '');
  
  // Supprimer les espaces multiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Formate une date pour l'affichage
 * @param {Date|string} date - La date à formater
 * @returns {string} La date formatée
 */
export function formatDate(date) {
  if (!date) return 'Inconnu';
  
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Vérifie si un dossier est exclu de l'indexation
 * @param {string} folderName - Le nom du dossier
 * @param {string[]} excludedFolders - Liste des dossiers exclus
 * @returns {boolean} Vrai si le dossier est exclu
 */
export function isFolderExcluded(folderName, excludedFolders) {
  if (!folderName || !excludedFolders) return false;
  return excludedFolders.includes(folderName);
}

/**
 * Récupère le nom du dossier parent à partir du chemin complet
 * @param {string} folderPath - Le chemin complet du dossier (ex: "Inbox/Work")
 * @returns {string} Le nom du dossier parent
 */
export function getParentFolder(folderPath) {
  if (!folderPath) return '';
  const parts = folderPath.split('/');
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

/**
 * Attend un certain temps
 * @param {number} ms - Temps en millisecondes
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Divise un tableau en chunks de taille donnée
 * @param {Array} array - Le tableau à diviser
 * @param {number} chunkSize - La taille de chaque chunk
 * @returns {Array[]} Tableau de chunks
 */
export function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
