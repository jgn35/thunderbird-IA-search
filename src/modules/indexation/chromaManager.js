/**
 * Module pour la gestion de ChromaDB
 * @module modules/indexation/chromaManager
 */

import { ChromaClient } from 'chromadb';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { generateEmailHash } from '../../utils/helpers.js';

/**
 * Client ChromaDB
 * @type {ChromaClient|null}
 */
let chromaClient = null;

/**
 * Collection ChromaDB pour les emails
 * @type {Object|null}
 */
let emailCollection = null;

/**
 * Chemin de la base de données ChromaDB
 * @type {string}
 */
const CHROMA_PATH = 'chroma_db';

/**
 * Nom de la collection pour les emails
 * @type {string}
 */
const EMAIL_COLLECTION_NAME = 'thunderbird_emails';

/**
 * Initialise le client ChromaDB
 * @returns {Promise<ChromaClient>}
 */
export async function initChromaClient() {
  try {
    if (chromaClient) {
      await logInfo('Client ChromaDB déjà initialisé');
      return chromaClient;
    }

    // Créer le client ChromaDB avec stockage local
    chromaClient = new ChromaClient({
      path: CHROMA_PATH,
    });

    await logInfo('Client ChromaDB initialisé avec succès');
    return chromaClient;
  } catch (error) {
    await logError(error, 'Initialisation du client ChromaDB');
    throw error;
  }
}

/**
 * Récupère ou crée la collection pour les emails
 * @returns {Promise<Object>}
 */
export async function getEmailCollection() {
  try {
    if (!chromaClient) {
      await initChromaClient();
    }

    if (emailCollection) {
      return emailCollection;
    }

    // Vérifier si la collection existe
    const collections = await chromaClient.listCollections();
    const existingCollection = collections.find(c => c.name === EMAIL_COLLECTION_NAME);

    if (existingCollection) {
      emailCollection = await chromaClient.getCollection(EMAIL_COLLECTION_NAME);
      await logInfo(`Collection "${EMAIL_COLLECTION_NAME}" récupérée`);
    } else {
      // Créer une nouvelle collection
      emailCollection = await chromaClient.createCollection({
        name: EMAIL_COLLECTION_NAME,
        metadata: {
          description: 'Collection pour les emails Thunderbird',
        },
      });
      await logInfo(`Collection "${EMAIL_COLLECTION_NAME}" créée`);
    }

    return emailCollection;
  } catch (error) {
    await logError(error, 'Récupération de la collection ChromaDB');
    throw error;
  }
}

/**
 * Ajoute ou met à jour un email dans ChromaDB
 * @param {Object} emailData - Les données de l'email à indexer
 * @param {string} emailData.id - ID de l'email
 * @param {string} emailData.subject - Sujet de l'email
 * @param {string} emailData.body - Corps de l'email
 * @param {string} emailData.from - Expéditeur
 * @param {string} emailData.to - Destinataire
 * @param {number} emailData.date - Date de l'email (timestamp)
 * @param {string} emailData.folderName - Nom du dossier
 * @returns {Promise<string>} L'ID de l'email dans ChromaDB
 */
export async function addOrUpdateEmail(emailData) {
  try {
    const collection = await getEmailCollection();
    
    const { id, subject, body, from, to, date, folderName } = emailData;
    
    // Générer un ID unique pour ChromaDB
    const lastModified = emailData.lastModified || Date.now();
    const chromaId = generateEmailHash(id, lastModified);

    // Créer le document pour ChromaDB
    const document = {
      id: chromaId,
      emailId: id,
      subject,
      body,
      from,
      to,
      date: date || Date.now(),
      folderName,
      lastModified,
    };

    // Ajouter ou mettre à jour le document
    await collection.upsert({
      ids: [chromaId],
      documents: [JSON.stringify(document)],
      metadatas: [{
        emailId: id,
        subject,
        from,
        to,
        date: date || Date.now(),
        folderName,
        lastModified,
      }],
    });

    await logInfo(`Email indexé dans ChromaDB : ${id} (${subject})`);
    return chromaId;
  } catch (error) {
    await logError(error, `Ajout/mise à jour de l'email ${emailData.id}`);
    throw error;
  }
}

/**
 * Supprime un email de ChromaDB
 * @param {string} emailId - L'ID de l'email à supprimer
 * @param {number} [lastModified] - Date de dernière modification (pour générer le hash)
 * @returns {Promise<void>}
 */
export async function deleteEmail(emailId, lastModified = null) {
  try {
    const collection = await getEmailCollection();
    const chromaId = generateEmailHash(emailId, lastModified || Date.now());

    await collection.delete({
      ids: [chromaId],
    });

    await logInfo(`Email supprimé de ChromaDB : ${emailId}`);
  } catch (error) {
    await logError(error, `Suppression de l'email ${emailId}`);
    throw error;
  }
}

/**
 * Vérifie si un email est déjà indexé dans ChromaDB
 * @param {string} emailId - L'ID de l'email
 * @param {number} [lastModified] - Date de dernière modification
 * @returns {Promise<boolean>} Vrai si l'email est indexé
 */
export async function isEmailIndexed(emailId, lastModified = null) {
  try {
    const collection = await getEmailCollection();
    const chromaId = generateEmailHash(emailId, lastModified || Date.now());

    const results = await collection.get({
      ids: [chromaId],
    });

    return results.ids && results.ids.length > 0;
  } catch (error) {
    await logError(error, `Vérification de l'indexation de l'email ${emailId}`);
    return false;
  }
}

/**
 * Recherche des emails dans ChromaDB
 * @param {string} query - La requête de recherche
 * @param {number} [limit=5] - Nombre maximal de résultats
 * @returns {Promise<Array>} Liste des emails pertinents
 */
export async function searchEmails(query, limit = 5) {
  try {
    const collection = await getEmailCollection();

    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
    });

    // Parser les résultats
    const emails = [];
    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i];
      const document = JSON.parse(results.documents[0][i]);
      const metadata = results.metadatas[0][i];

      emails.push({
        id,
        ...document,
        ...metadata,
        score: results.distances[0][i],
      });
    }

    await logInfo(`Recherche ChromaDB : ${emails.length} résultats pour "${query}"`);
    return emails;
  } catch (error) {
    await logError(error, `Recherche dans ChromaDB pour "${query}"`);
    return [];
  }
}

/**
 * Récupère tous les emails indexés dans ChromaDB
 * @returns {Promise<Array>} Liste de tous les emails indexés
 */
export async function getAllIndexedEmails() {
  try {
    const collection = await getEmailCollection();

    const results = await collection.get({
      limit: 10000, // Limite élevée pour récupérer tous les emails
    });

    const emails = [];
    for (let i = 0; i < results.ids.length; i++) {
      const id = results.ids[i];
      const document = JSON.parse(results.documents[i]);
      const metadata = results.metadatas[i];

      emails.push({
        id,
        ...document,
        ...metadata,
      });
    }

    await logInfo(`Récupération de ${emails.length} emails indexés`);
    return emails;
  } catch (error) {
    await logError(error, 'Récupération de tous les emails indexés');
    return [];
  }
}

/**
 * Supprime tous les emails de ChromaDB
 * @returns {Promise<void>}
 */
export async function clearAllEmails() {
  try {
    const collection = await getEmailCollection();
    await collection.delete({
      where: {},
    });
    await logInfo('Tous les emails ont été supprimés de ChromaDB');
  } catch (error) {
    await logError(error, 'Suppression de tous les emails');
    throw error;
  }
}

/**
 * Ferme la connexion ChromaDB
 * @returns {Promise<void>}
 */
export async function closeChromaClient() {
  try {
    if (chromaClient) {
      // ChromaDB n'a pas de méthode de fermeture explicite dans la version JS
      // On réinitialise simplement les variables
      chromaClient = null;
      emailCollection = null;
      await logInfo('Client ChromaDB fermé');
    }
  } catch (error) {
    await logError(error, 'Fermeture du client ChromaDB');
  }
}
