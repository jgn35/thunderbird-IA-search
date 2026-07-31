/**
 * Module de stockage vectoriel pour l'extension Thunderbird RAG Search
 * Utilise IndexedDB comme backend pour stocker les embeddings et métadonnées
 * @module modules/indexation/vectorStore
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { generateSingleEmbedding, cosineSimilarity } from './embeddingService.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Nom de la base de données IndexedDB
 * @type {string}
 */
const DB_NAME = 'ThunderbirdRAGVectorDB';

/**
 * Version de la base de données
 * @type {number}
 */
const DB_VERSION = 1;

/**
 * Nom du store pour les emails et leurs embeddings
 * @type {string}
 */
const EMAIL_STORE = 'emails';

/**
 * Instance de la base de données IndexedDB
 * @type {IDBDatabase|null}
 */
let db = null;

/**
 * File d'attente pour les opérations avant l'initialisation
 * @type {Array<Function>}
 */
const initQueue = [];

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
      
      // Exécuter les opérations en attente
      while (initQueue.length > 0) {
        const operation = initQueue.shift();
        operation();
      }
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;
      
      // Créer le store pour les emails avec index
      if (!dbInstance.objectStoreNames.contains(EMAIL_STORE)) {
        const emailStore = dbInstance.createObjectStore(EMAIL_STORE, { 
          keyPath: 'id',
          autoIncrement: false 
        });
        
        // Créer des index pour les recherches
        emailStore.createIndex('emailId', 'emailId', { unique: false });
        emailStore.createIndex('folderName', 'folderName', { unique: false });
        emailStore.createIndex('date', 'date', { unique: false });
        emailStore.createIndex('lastModified', 'lastModified', { unique: false });
        emailStore.createIndex('subject', 'subject', { unique: false });
        emailStore.createIndex('from', 'from', { unique: false });
        emailStore.createIndex('to', 'to', { unique: false });
        
        // Index pour la recherche vectorielle (non utilisé directement, mais pour référence)
        emailStore.createIndex('embeddingHash', 'embeddingHash', { unique: false });
      }
    };
  });
}

/**
 * Ajoute une opération à la file d'attente ou l'exécute immédiatement
 * @param {Function} operation - Opération à exécuter
 */
function queueOperation(operation) {
  if (db) {
    operation();
  } else {
    initQueue.push(operation);
    initDB().catch(console.error);
  }
}

/**
 * Initialise le vector store
 * @returns {Promise<Object>}
 */
export async function initVectorStore() {
  try {
    await initDB();
    await logInfo('Vector Store (IndexedDB) initialisé avec succès');
    return { 
      listCollections: async () => [
        { name: EMAIL_STORE, id: EMAIL_STORE }
      ],
      getCollection: async () => getEmailCollection(),
    };
  } catch (error) {
    await logError(error, 'Initialisation du Vector Store');
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
      
      /**
       * Ajoute ou met à jour un email avec son embedding
       * @param {Object} params - Paramètres d'upsert
       * @param {string[]} params.ids - IDs des documents
       * @param {string[]} params.documents - Documents (JSON stringifié)
       * @param {Object[]} params.metadatas - Métadonnées
       * @returns {Promise<void>}
       */
      upsert: async ({ ids, documents, metadatas }) => {
        return new Promise((resolve, reject) => {
          queueOperation(async () => {
            try {
              const tx = db.transaction(EMAIL_STORE, 'readwrite');
              const store = tx.objectStore(EMAIL_STORE);
              
              for (let i = 0; i < ids.length; i++) {
                const record = {
                  id: ids[i],
                  emailId: metadatas[i].emailId,
                  document: documents[i],
                  embedding: metadatas[i].embedding || null,
                  embeddingHash: metadatas[i].embeddingHash || '',
                  subject: metadatas[i].subject || '',
                  body: metadatas[i].body || '',
                  from: metadatas[i].from || '',
                  to: metadatas[i].to || '',
                  date: metadatas[i].date || null,
                  folderName: metadatas[i].folderName || '',
                  lastModified: metadatas[i].lastModified || null,
                  timestamp: Date.now(),
                };
                store.put(record);
              }
              
              tx.oncomplete = () => resolve();
              tx.onerror = (event) => reject(event.target.error);
            } catch (error) {
              reject(error);
            }
          });
        });
      },
      
      /**
       * Récupère des emails par ID
       * @param {Object} params - Paramètres de get
       * @param {string[]} params.ids - IDs à récupérer
       * @param {number} params.limit - Limite de résultats
       * @returns {Promise<Object>}
       */
      get: async ({ ids, limit = 10000 }) => {
        return new Promise((resolve) => {
          queueOperation(async () => {
            const tx = db.transaction(EMAIL_STORE, 'readonly');
            const store = tx.objectStore(EMAIL_STORE);
            
            const results = [];
            const idsToGet = ids || [];
            let pendingRequests = 0;
            
            if (idsToGet.length > 0) {
              pendingRequests = idsToGet.length;
              for (const id of idsToGet) {
                const request = store.get(id);
                request.onsuccess = () => {
                  if (request.result) {
                    results.push(request.result);
                  }
                  pendingRequests--;
                };
                request.onerror = () => {
                  pendingRequests--;
                };
              }
            } else {
              pendingRequests = 1;
              const request = store.getAll();
              request.onsuccess = () => {
                results.push(...request.result);
                pendingRequests--;
              };
              request.onerror = () => {
                pendingRequests--;
              };
            }
            
            tx.oncomplete = () => {
              // Attendre que toutes les requêtes soient terminées
              const checkComplete = () => {
                if (pendingRequests === 0) {
                  // Formater les résultats comme ChromaDB
                  const formattedResults = {
                    ids: results.map(r => r.id),
                    documents: results.map(r => r.document),
                    metadatas: results.map(r => ({
                      emailId: r.emailId,
                      subject: r.subject,
                      body: r.body,
                      from: r.from,
                      to: r.to,
                      date: r.date,
                      folderName: r.folderName,
                      lastModified: r.lastModified,
                      embeddingHash: r.embeddingHash,
                    })),
                    embeddings: results.map(r => r.embedding),
                  };
                  resolve(formattedResults);
                } else {
                  // Vérifier à nouveau après un court délai
                  setTimeout(checkComplete, 10);
                }
              };
              checkComplete();
            };
          });
        });
      },
      
      /**
       * Supprime des emails
       * @param {Object} params - Paramètres de delete
       * @param {string[]} params.ids - IDs à supprimer
       * @param {Object} params.where - Condition de suppression
       * @returns {Promise<void>}
       */
      delete: async ({ ids: idsToDelete, where }) => {
        return new Promise((resolve, reject) => {
          queueOperation(async () => {
            try {
              const tx = db.transaction(EMAIL_STORE, 'readwrite');
              const store = tx.objectStore(EMAIL_STORE);
              
              if (idsToDelete && idsToDelete.length > 0) {
                for (const id of idsToDelete) {
                  store.delete(id);
                }
              } else if (where) {
                // Supprimer tous les enregistrements
                const request = store.clear();
                request.onsuccess = () => {};
                request.onerror = (event) => {
                  throw event.target.error;
                };
              }
              
              tx.oncomplete = () => resolve();
              tx.onerror = (event) => reject(event.target.error);
            } catch (error) {
              reject(error);
            }
          });
        });
      },
      
      /**
       * Effectue une recherche vectorielle
       * @param {Object} params - Paramètres de query
       * @param {string[]} params.queryTexts - Textes de requête
       * @param {number} params.nResults - Nombre de résultats
       * @returns {Promise<Object>}
       */
      query: async ({ queryTexts, nResults = 5 }) => {
        return new Promise(async (resolve, reject) => {
          queueOperation(async () => {
            try {
              const queryText = queryTexts[0];
              
              // Générer l'embedding pour la requête AVANT de créer la transaction
              const embeddingResult = await generateSingleEmbedding(queryText);
              
              if (!embeddingResult.success) {
                await logError(new Error(embeddingResult.error), 'Recherche vectorielle');
                // Retourner une recherche par mots-clés en fallback
                const fallbackResults = await performKeywordSearch(queryText, nResults);
                resolve(fallbackResults);
                return;
              }
              
              const queryEmbedding = embeddingResult.embedding;
              
              // Créer la transaction APRÈS avoir l'embedding
              const tx = db.transaction(EMAIL_STORE, 'readonly');
              const store = tx.objectStore(EMAIL_STORE);
              
              // Récupérer tous les emails
              const allRequest = store.getAll();
              
              allRequest.onsuccess = () => {
                const allRecords = allRequest.result;
                
                // Calculer les similarités (synchronement, pas de await ici)
                const results = [];
                
                for (const record of allRecords) {
                  if (!record.embedding) {
                    continue; // Ignorer les emails sans embedding
                  }
                  
                  // Calculer la similarité cosinus
                  const similarity = cosineSimilarity(queryEmbedding, record.embedding);
                  const distance = 1 - similarity; // Convertir en distance (plus petit = meilleur)
                  
                  results.push({
                    id: record.id,
                    emailId: record.emailId,
                    document: record.document,
                    metadata: {
                      emailId: record.emailId,
                      subject: record.subject,
                      body: record.body,
                      from: record.from,
                      to: record.to,
                      date: record.date,
                      folderName: record.folderName,
                      lastModified: record.lastModified,
                    },
                    score: distance,
                  });
                }
                
                // Trier par score (meilleur score en premier)
                results.sort((a, b) => a.score - b.score);
                
                // Limiter les résultats
                const limitedResults = results.slice(0, nResults);
                
                // Formater les résultats comme ChromaDB
                const formattedResults = {
                  ids: [limitedResults.map(r => r.id)],
                  documents: [limitedResults.map(r => r.document)],
                  metadatas: [limitedResults.map(r => r.metadata)],
                  distances: [limitedResults.map(r => [r.score])],
                };
                
                resolve(formattedResults);
              };
              
              tx.oncomplete = () => {};
              tx.onerror = (event) => reject(event.target.error);
            } catch (error) {
              reject(error);
            }
          });
        });
      },
    };
  } catch (error) {
    await logError(error, 'Récupération de la collection Vector Store');
    throw error;
  }
}

/**
 * Effectue une recherche par mots-clés (fallback)
 * @param {string} query - Requête de recherche
 * @param {number} limit - Nombre de résultats
 * @returns {Promise<Object>} Résultats formatés
 */
async function performKeywordSearch(query, limit) {
  return new Promise((resolve) => {
    queueOperation(() => {
      const tx = db.transaction(EMAIL_STORE, 'readonly');
      const store = tx.objectStore(EMAIL_STORE);
      
      const results = [];
      const allRequest = store.getAll();
      
      allRequest.onsuccess = () => {
        const allRecords = allRequest.result;
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        for (const record of allRecords) {
          const text = `${record.subject} ${record.body} ${record.from} ${record.to}`.toLowerCase();
          
          // Vérifier si le texte contient des mots de la requête
          const matches = queryWords.filter(word => text.includes(word));
          
          if (matches.length > 0) {
            const score = matches.length / queryWords.length;
            results.push({
              id: record.id,
              emailId: record.emailId,
              document: record.document,
              metadata: {
                emailId: record.emailId,
                subject: record.subject,
                body: record.body,
                from: record.from,
                to: record.to,
                date: record.date,
                folderName: record.folderName,
                lastModified: record.lastModified,
              },
              score: 1 - score,
            });
          }
        }
        
        // Trier par score
        results.sort((a, b) => a.score - b.score);
        
        // Limiter les résultats
        const limitedResults = results.slice(0, limit);
        
        // Formater les résultats
        const formattedResults = {
          ids: [limitedResults.map(r => r.id)],
          documents: [limitedResults.map(r => r.document)],
          metadatas: [limitedResults.map(r => r.metadata)],
          distances: [limitedResults.map(r => [r.score])],
        };
        
        resolve(formattedResults);
      };
      
      allRequest.onerror = (event) => {
        // En cas d'erreur, résoudre avec un tableau vide
        resolve({
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
        });
      };
      
      tx.onerror = (event) => {
        resolve({
          ids: [[]],
          documents: [[]],
          metadatas: [[]],
          distances: [[]],
        });
      };
    });
  });
}

/**
 * Ajoute ou met à jour un email dans le vector store
 * @param {Object} emailData - Données de l'email à indexer
 * @param {string} emailData.id - ID unique de l'email
 * @param {string} emailData.emailId - ID Thunderbird de l'email
 * @param {string} emailData.subject - Sujet
 * @param {string} emailData.body - Corps
 * @param {string} emailData.from - Expéditeur
 * @param {string} emailData.to - Destinataire
 * @param {number} emailData.date - Date (timestamp)
 * @param {string} emailData.folderName - Nom du dossier
 * @param {number} emailData.lastModified - Date de dernière modification
 * @returns {Promise<string>} L'ID de l'email dans le vector store
 */
export async function addOrUpdateEmail(emailData) {
  try {
    const collection = await getEmailCollection();
    
    const { id, emailId, subject, body, from, to, date, folderName, lastModified } = emailData;
    
    // Générer l'embedding pour le contenu de l'email
    const embeddingText = `${subject}\n${body}`;
    const embeddingResult = await generateSingleEmbedding(embeddingText);
    
    let embedding = null;
    let embeddingHash = '';
    
    if (embeddingResult.success) {
      embedding = embeddingResult.embedding;
      // Créer un hash simple pour l'index
      embeddingHash = embedding.slice(0, 16).join('-');
    } else {
      await logWarn(`Impossible de générer l'embedding pour l'email ${emailId}: ${embeddingResult.error}`);
      // Utiliser un vecteur nul
      embedding = new Array(384).fill(0);
    }

    // Créer le document pour le stockage
    const document = {
      id: id,
      emailId: emailId,
      subject,
      body,
      from,
      to,
      date: date || Date.now(),
      folderName,
      lastModified: lastModified || Date.now(),
    };

    // Ajouter ou mettre à jour le document
    await collection.upsert({
      ids: [id],
      documents: [JSON.stringify(document)],
      metadatas: [{
        emailId,
        subject,
        body,
        from,
        to,
        date: date || Date.now(),
        folderName,
        lastModified: lastModified || Date.now(),
        embedding,
        embeddingHash,
      }],
    });

    await logInfo(`Email indexé dans Vector Store : ${emailId} (${subject})`);
    return id;
  } catch (error) {
    await logError(error, `Ajout/mise à jour de l'email ${emailData.emailId}`);
    throw error;
  }
}

/**
 * Supprime un email du vector store
 * @param {string} emailId - L'ID de l'email à supprimer
 * @param {number} [lastModified] - Date de dernière modification (pour générer le hash)
 * @returns {Promise<void>}
 */
export async function deleteEmail(emailId, lastModified = null) {
  try {
    const collection = await getEmailCollection();
    
    // Générer le même ID que lors de l'ajout
    // Note: Dans notre implémentation, l'ID est fourni lors de l'ajout
    // Pour la suppression, nous devons récupérer l'ID depuis la base
    
    // Récupérer tous les emails avec cet emailId
    const tx = db.transaction(EMAIL_STORE, 'readonly');
    const store = tx.objectStore(EMAIL_STORE);
    const index = store.index('emailId');
    
    const matchingRecords = [];
    const request = index.getAll(emailId);
    
    request.onsuccess = () => {
      matchingRecords.push(...request.result);
    };
    
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
    
    // Supprimer tous les enregistrements correspondants
    if (matchingRecords.length > 0) {
      const idsToDelete = matchingRecords.map(r => r.id);
      await collection.delete({ ids: idsToDelete });
    }

    await logInfo(`Email supprimé du Vector Store : ${emailId}`);
  } catch (error) {
    await logError(error, `Suppression de l'email ${emailId}`);
    throw error;
  }
}

/**
 * Vérifie si un email est déjà indexé
 * @param {string} emailId - L'ID de l'email
 * @param {number} [lastModified] - Date de dernière modification
 * @returns {Promise<boolean>} Vrai si l'email est indexé
 */
export async function isEmailIndexed(emailId, lastModified = null) {
  try {
    const collection = await getEmailCollection();
    
    // Récupérer les emails avec cet emailId
    const result = await collection.get({ limit: 10000 });
    
    const matchingRecords = result.ids.filter((id, index) => {
      const metadata = result.metadatas[index];
      return metadata.emailId === emailId;
    });

    return matchingRecords.length > 0;
  } catch (error) {
    await logError(error, `Vérification de l'indexation de l'email ${emailId}`);
    return false;
  }
}

/**
 * Recherche des emails dans le vector store
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

    await logInfo(`Recherche Vector Store : ${emails.length} résultats pour "${query}"`);
    return emails;
  } catch (error) {
    await logError(error, `Recherche dans Vector Store pour "${query}"`);
    return [];
  }
}

/**
 * Récupère tous les emails indexés
 * @returns {Promise<Array>} Liste de tous les emails indexés
 */
export async function getAllIndexedEmails() {
  try {
    const collection = await getEmailCollection();

    const results = await collection.get({
      limit: 10000,
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
 * Supprime tous les emails du vector store
 * @returns {Promise<void>}
 */
export async function clearAllEmails() {
  try {
    const collection = await getEmailCollection();
    await collection.delete({
      where: {},
    });
    await logInfo('Tous les emails ont été supprimés du Vector Store');
  } catch (error) {
    await logError(error, 'Suppression de tous les emails');
    throw error;
  }
}

/**
 * Ferme la connexion IndexedDB
 * @returns {Promise<void>}
 */
export async function closeVectorStore() {
  try {
    if (db) {
      db.close();
      db = null;
      await logInfo('Vector Store (IndexedDB) fermé');
    }
  } catch (error) {
    await logError(error, 'Fermeture du Vector Store');
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

/**
 * Récupère les statistiques du vector store
 * @returns {Promise<Object>} Statistiques
 */
export async function getStats() {
  try {
    await initDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(EMAIL_STORE, 'readonly');
      const store = tx.objectStore(EMAIL_STORE);
      
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve({
          totalEmails: countRequest.result,
        });
      };
      
      tx.oncomplete = () => {};
    });
  } catch (error) {
    await logError(error, 'Récupération des statistiques du Vector Store');
    return { totalEmails: 0 };
  }
}
