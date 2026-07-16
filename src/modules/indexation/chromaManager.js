/**
 * Module pour la gestion de ChromaDB
 * Utilise IndexedDB comme backend pour une solution locale sans serveur
 * @module modules/indexation/chromaManager
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { generateEmailHash } from '../../utils/helpers.js';

/**
 * Nom de la base de données IndexedDB
 * @type {string}
 */
const DB_NAME = 'ThunderbirdRAGDB';

/**
 * Version de la base de données
 * @type {number}
 */
const DB_VERSION = 1;

/**
 * Nom du store pour les emails
 * @type {string}
 */
const EMAIL_STORE = 'emails';

/**
 * Nom du store pour les embeddings (simulés)
 * @type {string}
 */
const EMBEDDING_STORE = 'embeddings';

/**
 * Instance de la base de données IndexedDB
 * @type {IDBDatabase|null}
 */
let db = null;

/**
 * Initialise la base de données IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      logError(event.target.error, 'Ouverture de la base de données IndexedDB');
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      logInfo('Base de données IndexedDB initialisée avec succès');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      
      // Créer le store pour les emails
      if (!dbInstance.objectStoreNames.contains(EMAIL_STORE)) {
        const emailStore = dbInstance.createObjectStore(EMAIL_STORE, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        emailStore.createIndex('emailId', 'emailId', { unique: false });
        emailStore.createIndex('folderName', 'folderName', { unique: false });
        emailStore.createIndex('date', 'date', { unique: false });
        emailStore.createIndex('lastModified', 'lastModified', { unique: false });
        emailStore.createIndex('subject', 'subject', { unique: false });
      }
      
      // Créer le store pour les embeddings (simulés)
      if (!dbInstance.objectStoreNames.contains(EMBEDDING_STORE)) {
        const embeddingStore = dbInstance.createObjectStore(EMBEDDING_STORE, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        embeddingStore.createIndex('emailId', 'emailId', { unique: false });
      }
    };
  });
}

/**
 * Initialise le client ChromaDB (simulé avec IndexedDB)
 * @returns {Promise<Object>}
 */
export async function initChromaClient() {
  try {
    await initDB();
    await logInfo('Client ChromaDB (IndexedDB) initialisé avec succès');
    return { 
      listCollections: async () => [
        { name: EMAIL_STORE, id: EMAIL_STORE }
      ],
      getCollection: async () => getEmailCollection(),
      createCollection: async () => getEmailCollection(),
    };
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
    await initDB();
    
    return {
      name: EMAIL_STORE,
      upsert: async ({ ids, documents, metadatas }) => {
        const tx = db.transaction(EMAIL_STORE, 'readwrite');
        const store = tx.objectStore(EMAIL_STORE);
        
        for (let i = 0; i < ids.length; i++) {
          const record = {
            id: ids[i],
            emailId: metadatas[i].emailId,
            document: documents[i],
            ...metadatas[i],
            timestamp: Date.now(),
          };
          store.put(record);
        }
        
        return Promise.resolve();
      },
      get: async ({ ids, limit = 10000 }) => {
        const tx = db.transaction(EMAIL_STORE, 'readonly');
        const store = tx.objectStore(EMAIL_STORE);
        
        const results = [];
        const idsToGet = ids || [];
        
        if (idsToGet.length > 0) {
          for (const id of idsToGet) {
            const request = store.get(id);
            request.onsuccess = () => {
              if (request.result) {
                results.push(request.result);
              }
            };
          }
        } else {
          const request = store.getAll();
          request.onsuccess = () => {
            results.push(...request.result);
          };
        }
        
        await new Promise((resolve) => {
          tx.oncomplete = () => resolve();
        });
        
        return {
          ids: results.map(r => r.id),
          documents: results.map(r => r.document),
          metadatas: results.map(r => ({
            emailId: r.emailId,
            subject: r.subject,
            from: r.from,
            to: r.to,
            date: r.date,
            folderName: r.folderName,
            lastModified: r.lastModified,
          })),
        };
      },
      delete: async ({ ids: idsToDelete, where }) => {
        const tx = db.transaction(EMAIL_STORE, 'readwrite');
        const store = tx.objectStore(EMAIL_STORE);
        
        if (idsToDelete && idsToDelete.length > 0) {
          for (const id of idsToDelete) {
            store.delete(id);
          }
        } else if (where) {
          // Supprimer tous les enregistrements
          const request = store.clear();
          await new Promise((resolve, reject) => {
            request.onsuccess = resolve;
            request.onerror = reject;
          });
        }
        
        await new Promise((resolve) => {
          tx.oncomplete = resolve;
        });
        
        return Promise.resolve();
      },
      query: async ({ queryTexts, nResults = 5 }) => {
        // Recherche simple par mots-clés (simulation de recherche vectorielle)
        const query = queryTexts[0].toLowerCase();
        
        const tx = db.transaction(EMAIL_STORE, 'readonly');
        const store = tx.objectStore(EMAIL_STORE);
        const index = store.index('subject');
        
        const results = [];
        const allRequest = store.getAll();
        
        allRequest.onsuccess = () => {
          const allRecords = allRequest.result;
          
          // Filtrer les records qui contiennent des mots de la requête
          const queryWords = query.split(/\s+/).filter(w => w.length > 2);
          
          for (const record of allRecords) {
            const document = record.document;
            const subject = record.subject || '';
            const body = document ? JSON.parse(document).body || '' : '';
            const from = record.from || '';
            const to = record.to || '';
            
            const text = `${subject} ${body} ${from} ${to}`.toLowerCase();
            
            // Vérifier si le texte contient des mots de la requête
            const matches = queryWords.filter(word => text.includes(word));
            
            if (matches.length > 0) {
              // Calculer un score simple basé sur le nombre de correspondances
              const score = matches.length / queryWords.length;
              results.push({
                id: record.id,
                emailId: record.emailId,
                document: record.document,
                metadata: {
                  emailId: record.emailId,
                  subject: record.subject,
                  from: record.from,
                  to: record.to,
                  date: record.date,
                  folderName: record.folderName,
                  lastModified: record.lastModified,
                },
                score: 1 - score, // ChromaDB retourne des distances (plus petit = meilleur)
              });
            }
          }
          
          // Trier par score (meilleur score en premier)
          results.sort((a, b) => a.score - b.score);
        };
        
        await new Promise((resolve) => {
          tx.oncomplete = resolve;
        });
        
        // Limiter les résultats
        const limitedResults = results.slice(0, nResults);
        
        return {
          ids: [limitedResults.map(r => r.id)],
          documents: [limitedResults.map(r => r.document)],
          metadatas: [limitedResults.map(r => r.metadata)],
          distances: [limitedResults.map(r => [r.score])],
        };
      },
    };
  } catch (error) {
    await logError(error, 'Récupération de la collection ChromaDB');
    throw error;
  }
}

/**
 * Ajoute ou met à jour un email dans ChromaDB (IndexedDB)
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
        score: results.distances[0][i][0],
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
    if (db) {
      db.close();
      db = null;
      await logInfo('Client ChromaDB fermé');
    }
  } catch (error) {
    await logError(error, 'Fermeture du client ChromaDB');
  }
}

/**
 * Supprime la base de données IndexedDB
 * @returns {Promise<void>}
 */
export async function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onerror = (event) => {
      logError(event.target.error, 'Suppression de la base de données');
      reject(event.target.error);
    };
    
    request.onsuccess = () => {
      db = null;
      logInfo('Base de données IndexedDB supprimée');
      resolve();
    };
  });
}
