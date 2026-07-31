/**
 * Script de fond pour l'extension Thunderbird RAG Search
 * Gère les événements en arrière-plan et la communication entre les modules
 * @module background
 */

import { logInfo, logError, logWarn } from './utils/logger.js';
import { getConfig, saveConfig } from './config/storageManager.js';
import {
  indexEmail,
  unindexEmail,
  getIndexStats,
  initIndexer,
  indexAllEmails,
  indexModifiedEmails,
  clearIndex,
  getIndexationState,
  checkEmailIndexed,
  checkEmbeddingConfig,
} from './modules/indexation/indexer.js';
import {
  getInlineTextParts,
  extractBodyFromFullMessage,
  extractAddressInfo,
} from './modules/indexation/emailFetcher.js';

/**
 * Obtient l'API messenger disponible
 * Dans Thunderbird, on peut utiliser soit browser.messenger soit messenger (objet global)
 * @returns {Object|null} L'API messenger ou null si non disponible
 */
function getMessengerAPI() {
  // Essayer messenger (objet global dans les modules privilégés)
  if (typeof messenger !== 'undefined' && messenger) {
    return messenger;
  }
  
  // Essayer browser.messenger (API standard WebExtension)
  if (typeof browser !== 'undefined' && browser && browser.messenger) {
    return browser.messenger;
  }
  
  return null;
}

/**
 * Gère une requête messenger directement
 * @param {string} type - Type de l'opération
 * @param {Object} data - Données à transmettre
 * @returns {Promise<any>} Résultat de l'opération
 */
async function handleMessengerRequest(type, data = {}) {
  const messengerAPI = getMessengerAPI();
  
  if (!messengerAPI) {
    throw new Error('Aucune API messenger disponible');
  }
  
  try {
    switch (type) {
      case 'MESSENGER_GET_ACCOUNTS':
        return await messengerAPI.accounts.list();
      
      case 'MESSENGER_GET_FOLDERS':
        return await messengerAPI.folders.query({ accountId: data.accountId });
      
      case 'MESSENGER_GET_EMAILS':
        // messages.list() prend UN objet avec les propriétés, pas deux arguments
        return await messengerAPI.messages.list({
          folderId: data.folderId,
          ...(data.options || {})
        });
      
      case 'MESSENGER_GET_FULL_EMAIL':
        return await messengerAPI.messages.getFull(data.messageId);
      
      case 'MESSENGER_GET_FOLDER':
        return await messengerAPI.folders.get(data.folderId);
      
      case 'MESSENGER_GET_MESSAGE':
        return await messengerAPI.messages.get(data.messageId);
    
    case 'MESSENGER_EMAIL_EXISTS':
      try {
        const message = await messengerAPI.messages.get(data.messageId);
        return !!message;
      } catch (error) {
        return false;
      }
      
      default:
        throw new Error(`Type de requête messenger inconnu: ${type}`);
    }
  } catch (error) {
    await logError(error, `Requête messenger: ${type}`);
    throw error;
  }
}

/**
 * Initialise le script de fond
 */
async function initBackground() {
  try {
    await logInfo('Initialisation du script de fond');
    
    // Vérifier la disponibilité de l'API messenger
    const messengerAPI = getMessengerAPI();
    
    if (!messengerAPI) {
      await logError('CRITICAL: Aucune API messenger disponible (ni browser.messenger ni messenger). ' +
                    'Vérifiez que le script est exécuté dans le contexte du background.');
    } else {
      await logInfo('API messenger est disponible dans le background script');
    }
    
    // Initialiser l'indexeur
    await initIndexer();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Vérifier les emails supprimés/modifiés périodiquement
    startPeriodicChecks();
    
    await logInfo('Script de fond initialisé avec succès');
  } catch (error) {
    await logError(error, 'Initialisation du script de fond');
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Écouter les messages des autres parties de l'extension
  const runtimeAPI = typeof browser !== 'undefined' ? browser.runtime : null;
  
  if (runtimeAPI && runtimeAPI.onMessage) {
    runtimeAPI.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message, sender, sendResponse);
      return true; // Indique que sendResponse sera appelé de manière asynchrone
    });
  }

  // Écouter les changements dans les emails
  const messengerAPI = getMessengerAPI();
  
  if (messengerAPI && messengerAPI.messages) {
    messengerAPI.messages.onNewMailReceived.addListener((folder, messages) => {
      if (Array.isArray(messages)) {
        for (const message of messages) {
          handleMessageCreated(message);
        }
      }
    });

    messengerAPI.messages.onUpdated.addListener((message, changedProperties, oldProperties) => {
      handleMessageModified(message);
    });

    messengerAPI.messages.onDeleted.addListener((messageIds) => {
      handleMessagesDeleted(messageIds);
    });

    messengerAPI.messages.onMoved.addListener((messageIds, sourceFolderId, destinationFolderId) => {
      handleMessagesMoved(messageIds, sourceFolderId, destinationFolderId);
    });
  }

  // Écouter les changements dans les dossiers
  if (messengerAPI && messengerAPI.folders) {
    messengerAPI.folders.onCreated.addListener((folder) => {
      handleFolderCreated(folder);
    });

    messengerAPI.folders.onDeleted.addListener((folderId) => {
      handleFolderDeleted(folderId);
    });

    messengerAPI.folders.onFolderInfoChanged.addListener((folder, folderInfo) => {
      handleFolderModified(folder);
    });
  }
}

/**
 * Gère les messages reçus
 * @param {Object} message - Le message reçu
 * @param {Object} sender - L'expéditeur du message
 * @param {Function} sendResponse - Fonction pour envoyer une réponse
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    await logInfo(`Message reçu : ${message.type}`);
    
    // Gérer les requêtes messenger directement
    if (message.type.startsWith('MESSENGER_')) {
      try {
        const data = await handleMessengerRequest(message.type, message);
        sendResponse({ success: true, data });
        return;
      } catch (error) {
        sendResponse({ success: false, error: error.message });
        return;
      }
    }
    
    switch (message.type) {
      case 'GET_INDEX_STATS':
        const stats = await getIndexStats();
        sendResponse({ success: true, stats });
        break;
        
      case 'INDEX_EMAIL':
        const result = await indexEmail(message.emailData);
        sendResponse({ success: result });
        break;
        
      case 'UNINDEX_EMAIL':
        const unindexResult = await unindexEmail(message.emailId, message.lastModified);
        sendResponse({ success: unindexResult });
        break;
        
      case 'GET_CONFIG':
        const config = await getConfig();
        sendResponse({ success: true, config });
        break;

      case 'GET_ACCOUNTS_AND_FOLDERS':
        const accountsAndFolders = await getAccountsAndFolders();
        sendResponse({ success: true, ...accountsAndFolders });
        break;

      // Nouveaux types de messages pour l'indexation
      case 'INDEX_ALL_EMAILS':
        const allResult = await indexAllEmails(message.selectedFolderIds, message.config);
        sendResponse({ success: allResult.success, ...allResult });
        break;
        
      case 'INDEX_MODIFIED_EMAILS':
        const modifiedResult = await indexModifiedEmails(message.selectedFolderIds, message.config);
        sendResponse({ success: modifiedResult.success, ...modifiedResult });
        break;
        
      case 'CLEAR_INDEX':
        const clearResult = await clearIndex();
        sendResponse({ success: clearResult.success, ...clearResult });
        break;
        
      case 'GET_INDEXATION_STATE':
        const state = getIndexationState();
        sendResponse({ success: true, state });
        break;
        
      case 'CHECK_EMAIL_INDEXED':
        const isIndexed = await checkEmailIndexed(message.emailId, message.lastModified);
        sendResponse({ success: true, isIndexed });
        break;
        
      case 'CHECK_EMBEDDING_CONFIG':
        const embeddingConfig = await checkEmbeddingConfig();
        sendResponse({ success: true, ...embeddingConfig });
        break;

      // Messages depuis content.js
      case 'EMAIL_CLICKED':
        await logInfo(`Email cliqué : ${message.messageId}`);
        sendResponse({ success: true });
        break;
        
      case 'FOCUS_SEARCH':
        await logInfo('Focus sur la recherche demandé');
        sendResponse({ success: true });
        break;

      default:
        await logWarn(`Type de message inconnu : ${message.type}`);
        sendResponse({ success: false, error: 'Type de message inconnu' });
    }
  } catch (error) {
    await logError(error, `Traitement du message : ${message.type}`);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Récupère les comptes et dossiers
 * @returns {Promise<Object>} Objet contenant les comptes et dossiers
 */
async function getAccountsAndFolders() {
  try {
    await logInfo('Récupération des comptes et dossiers');
    
    const messengerAPI = getMessengerAPI();
    
    if (!messengerAPI) {
      throw new Error('Aucune API messenger disponible');
    }
    
    // Récupérer les comptes
    const accounts = await messengerAPI.accounts.list();
    
    if (accounts.length === 0) {
      await logWarn('Aucun compte trouvé - vérifiez les permissions dans manifest.json');
      return { accounts: [], folders: [] };
    }
    
    // Récupérer tous les dossiers pour chaque compte
    let allFolders = [];
    for (const account of accounts) {
      try {
        const folders = await messengerAPI.folders.query({ accountId: account.id });
        allFolders = allFolders.concat(folders);
      } catch (error) {
        await logError(error, `Erreur lors de la récupération des dossiers pour le compte ${account.id}`);
      }
    }
    
    await logInfo(`Trouvé ${accounts.length} comptes et ${allFolders.length} dossiers`);
    
    return { accounts, folders: allFolders };
  } catch (error) {
    await logError(error, 'Récupération des comptes et dossiers');
    return { accounts: [], folders: [] };
  }
}

/**
 * Gère la création d'un nouvel email
 * @param {Object} message - L'email créé
 */
async function handleMessageCreated(message) {
  try {
    await logInfo(`Nouvel email créé : ${message.id}`);
    
    const messengerAPI = getMessengerAPI();
    if (!messengerAPI) return;
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de l'email est sélectionné pour l'indexation
    if (selectedFolders.includes(message.folderId)) {
      // Récupérer le contenu complet de l'email
      const fullEmail = await messengerAPI.messages.getFull(message.id);
      
      if (fullEmail) {
        // Extraire les informations d'adresse
        const { author, recipients } = extractAddressInfo(fullEmail);
        
        // Extraire le corps du message
        let body = '';
        if (fullEmail) {
          const inlineParts = await getInlineTextParts(message.id);
          if (inlineParts && inlineParts.length > 0) {
            const textPart = inlineParts.find(p => p.contentType === 'text/plain') || inlineParts[0];
            body = textPart.content || '';
          } else {
            body = extractBodyFromFullMessage(fullEmail);
          }
        }
        
        // Indexer le nouvel email
        await indexEmail({
          id: message.id,
          folderId: fullEmail.folderId,
          folderName: '', // À récupérer
          subject: fullEmail.subject || '',
          body: body,
          from: author,
          to: recipients.join(', '),
          date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
          lastModified: fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null,
        });
        
        await logInfo(`Nouvel email indexé : ${message.id}`);
      }
    }
  } catch (error) {
    await logError(error, `Traitement de la création de l'email : ${message.id}`);
  }
}

/**
 * Gère la modification d'un email
 * @param {Object} message - L'email modifié
 */
async function handleMessageModified(message) {
  try {
    await logInfo(`Email modifié : ${message.id}`);
    
    const messengerAPI = getMessengerAPI();
    if (!messengerAPI) return;
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de l'email est sélectionné pour l'indexation
    if (selectedFolders.includes(message.folderId)) {
      // Récupérer le contenu complet de l'email
      const fullEmail = await messengerAPI.messages.getFull(message.id);
      
      if (fullEmail) {
        // Extraire les informations d'adresse
        const { author, recipients } = extractAddressInfo(fullEmail);
        
        // Extraire le corps du message
        let body = '';
        if (fullEmail) {
          const inlineParts = await getInlineTextParts(message.id);
          if (inlineParts && inlineParts.length > 0) {
            const textPart = inlineParts.find(p => p.contentType === 'text/plain') || inlineParts[0];
            body = textPart.content || '';
          } else {
            body = extractBodyFromFullMessage(fullEmail);
          }
        }
        
        // Réindexer l'email modifié
        await indexEmail({
          id: message.id,
          folderId: fullEmail.folderId,
          folderName: '', // À récupérer
          subject: fullEmail.subject || '',
          body: body,
          from: author,
          to: recipients.join(', '),
          date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
          lastModified: fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null,
        });
        
        await logInfo(`Email réindexé : ${message.id}`);
      }
    }
  } catch (error) {
    await logError(error, `Traitement de la modification de l'email : ${message.id}`);
  }
}

/**
 * Gère la suppression d'emails
 * @param {string[]} messageIds - Liste des IDs des emails supprimés
 */
async function handleMessagesDeleted(messageIds) {
  try {
    await logInfo(`Emails supprimés : ${messageIds.join(', ')}`);
    
    // Désindexer chaque email supprimé
    for (const messageId of messageIds) {
      await unindexEmail(messageId);
    }
    
    await logInfo(`${messageIds.length} emails désindexés`);
  } catch (error) {
    await logError(error, 'Traitement de la suppression des emails');
  }
}

/**
 * Gère le déplacement d'emails
 * @param {string[]} messageIds - Liste des IDs des emails déplacés
 * @param {string} sourceFolderId - ID du dossier source
 * @param {string} destinationFolderId - ID du dossier de destination
 */
async function handleMessagesMoved(messageIds, sourceFolderId, destinationFolderId) {
  try {
    await logInfo(`Emails déplacés : ${messageIds.join(', ')} de ${sourceFolderId} vers ${destinationFolderId}`);
    
    const messengerAPI = getMessengerAPI();
    if (!messengerAPI) return;
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de destination est sélectionné pour l'indexation
    const destinationSelected = selectedFolders.includes(destinationFolderId);
    const sourceSelected = selectedFolders.includes(sourceFolderId);
    
    for (const messageId of messageIds) {
      if (destinationSelected && !sourceSelected) {
        // L'email est déplacé vers un dossier indexé : l'indexer
        const fullEmail = await messengerAPI.messages.getFull(messageId);
        if (fullEmail) {
          // Extraire les informations d'adresse
          const { author, recipients } = extractAddressInfo(fullEmail);
          
          // Extraire le corps du message
          let body = '';
          if (fullEmail) {
            const inlineParts = await getInlineTextParts(messageId);
            if (inlineParts && inlineParts.length > 0) {
              const textPart = inlineParts.find(p => p.contentType === 'text/plain') || inlineParts[0];
              body = textPart.content || '';
            } else {
              body = extractBodyFromFullMessage(fullEmail);
            }
          }
          
          await indexEmail({
            id: messageId,
            folderId: destinationFolderId,
            folderName: '', // À récupérer
            subject: fullEmail.subject || '',
            body: body,
            from: author,
            to: recipients.join(', '),
            date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
            lastModified: fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null,
          });
        }
      } else if (!destinationSelected && sourceSelected) {
        // L'email est déplacé hors d'un dossier indexé : le désindexer
        await unindexEmail(messageId);
      }
    }
    
    await logInfo(`Emails traités après déplacement : ${messageIds.length}`);
  } catch (error) {
    await logError(error, 'Traitement du déplacement des emails');
  }
}

/**
 * Gère la création d'un dossier
 * @param {Object} folder - Le dossier créé
 */
async function handleFolderCreated(folder) {
  try {
    await logInfo(`Nouveau dossier créé : ${folder.id} (${folder.name})`);
    
    // Si le dossier est sélectionné pour l'indexation, indexer ses emails
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    if (selectedFolders.includes(folder.id)) {
      await logInfo(`Nouveau dossier sélectionné pour l'indexation : ${folder.name}`);
    }
  } catch (error) {
    await logError(error, `Traitement de la création du dossier : ${folder.id}`);
  }
}

/**
 * Gère la suppression d'un dossier
 * @param {string} folderId - ID du dossier supprimé
 */
async function handleFolderDeleted(folderId) {
  try {
    await logInfo(`Dossier supprimé : ${folderId}`);
    // Désindexer tous les emails du dossier supprimé
    // (Cela sera géré par la suppression des emails individuels)
  } catch (error) {
    await logError(error, `Traitement de la suppression du dossier : ${folderId}`);
  }
}

/**
 * Gère la modification d'un dossier
 * @param {Object} folder - Le dossier modifié
 */
async function handleFolderModified(folder) {
  try {
    await logInfo(`Dossier modifié : ${folder.id} (${folder.name})`);
    // Si le nom du dossier a changé, mettre à jour l'index
    // (Cela sera géré par la réindexation des emails)
  } catch (error) {
    await logError(error, `Traitement de la modification du dossier : ${folder.id}`);
  }
}

/**
 * Démarre les vérifications périodiques
 */
function startPeriodicChecks() {
  // Vérifier les emails modifiés toutes les 5 minutes
  setInterval(async () => {
    try {
      const config = await getConfig();
      const selectedFolders = config.selectedFolders || [];
      
      if (selectedFolders.length > 0) {
        // Indexer les emails modifiés via le background
        await indexModifiedEmails(selectedFolders);
      }
    } catch (error) {
      await logError(error, 'Vérification périodique des emails modifiés');
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Initialiser le script de fond
initBackground();
