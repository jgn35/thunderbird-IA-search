/**
 * Module pour la récupération des emails depuis Thunderbird
 * @module modules/indexation/emailFetcher
 * 
 * NOTE: Ce module peut être appelé depuis différents contextes (sidebar, background, options).
 * Il doit donc utiliser browser.runtime.sendMessage() pour accéder à l'API messenger,
 * car browser.messenger n'est disponible que dans le background script.
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { isFolderExcluded, isEmailTooLarge } from '../../utils/helpers.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Envoie un message au background script pour exécuter une opération messenger
 * @param {string} type - Type de l'opération
 * @param {Object} data - Données à transmettre
 * @returns {Promise<any>} Résultat de l'opération
 */
async function sendMessengerRequest(type, data = {}) {
  try {
    // Dans le background script, browser.messenger est disponible directement
    if (typeof browser !== 'undefined' && browser.messenger) {
      // On est dans le background script, on peut utiliser messenger directement
      return await handleMessengerRequest(type, data);
    }
    
    // Dans d'autres contextes (sidebar, options), on passe par le background
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.sendMessage) {
      const response = await browser.runtime.sendMessage({ type, ...data });
      if (response && response.success) {
        return response.data;
      }
      throw new Error(response?.error || 'Erreur inconnue');
    }
    
    throw new Error('API browser.runtime.sendMessage non disponible');
  } catch (error) {
    await logError(error, `Requête messenger: ${type}`);
    throw error;
  }
}

/**
 * Gère une requête messenger directement (pour le background script)
 * @param {string} type - Type de l'opération
 * @param {Object} data - Données à transmettre
 * @returns {Promise<any>} Résultat de l'opération
 */
async function handleMessengerRequest(type, data = {}) {
  const messengerAPI = typeof messenger !== 'undefined' ? messenger : browser.messenger;
  
  switch (type) {
    case 'MESSENGER_GET_ACCOUNTS':
      return await messengerAPI.accounts.list();
    
    case 'MESSENGER_GET_FOLDERS':
      return await messengerAPI.folders.query({ accountId: data.accountId });
    
    case 'MESSENGER_GET_EMAILS':
      return await messengerAPI.messages.list(data.folderId, data.options || {});
    
    case 'MESSENGER_GET_FULL_EMAIL':
      return await messengerAPI.messages.getFull(data.messageId);
    
    case 'MESSENGER_GET_FOLDER':
      return await messengerAPI.folders.get(data.folderId);
    
    case 'MESSENGER_GET_MESSAGE':
      return await messengerAPI.messages.get(data.messageId);
    
    default:
      throw new Error(`Type de requête inconnu: ${type}`);
  }
}

/**
 * Récupère la liste de tous les comptes email
 * @returns {Promise<Array>} Liste des comptes
 */
export async function getAccounts() {
  try {
    const accounts = await sendMessengerRequest('MESSENGER_GET_ACCOUNTS');
    await logInfo(`Récupération de ${accounts.length} comptes email`);
    return accounts;
  } catch (error) {
    await logError(error, 'Récupération des comptes');
    return [];
  }
}

/**
 * Récupère la liste des dossiers pour un compte
 * @param {string} accountId - L'ID du compte
 * @returns {Promise<Array>} Liste des dossiers
 */
export async function getFolders(accountId) {
  try {
    const folders = await sendMessengerRequest('MESSENGER_GET_FOLDERS', { accountId });
    await logInfo(`Récupération de ${folders.length} dossiers pour le compte ${accountId}`);
    return folders;
  } catch (error) {
    await logError(error, `Récupération des dossiers pour le compte ${accountId}`);
    return [];
  }
}

/**
 * Récupère la liste des emails dans un dossier
 * @param {string} folderId - L'ID du dossier
 * @param {Object} [options] - Options de filtrage
 * @param {number} [options.limit] - Limite de résultats
 * @param {number} [options.offset] - Décalage
 * @returns {Promise<Object>} Objet contenant la liste des emails et le total
 */
export async function getEmails(folderId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  try {
    const result = await sendMessengerRequest('MESSENGER_GET_EMAILS', {
      folderId,
      options: { limit, offset }
    });
    
    await logInfo(`Récupération de ${result.messages.length} emails dans le dossier ${folderId}`);
    
    return {
      messages: result.messages,
      total: result.total,
    };
  } catch (error) {
    await logError(error, `Récupération des emails dans le dossier ${folderId}`);
    return { messages: [], total: 0 };
  }
}

/**
 * Récupère le contenu complet d'un email
 * @param {string} messageId - L'ID du message
 * @returns {Promise<Object|null>} L'email complet ou null en cas d'erreur
 */
export async function getFullEmail(messageId) {
  try {
    const message = await sendMessengerRequest('MESSENGER_GET_FULL_EMAIL', { messageId });
    return message;
  } catch (error) {
    await logError(error, `Récupération de l'email ${messageId}`);
    return null;
  }
}

/**
 * Récupère les informations d'un dossier
 * @param {string} folderId - L'ID du dossier
 * @returns {Promise<Object|null>} Les informations du dossier ou null
 */
export async function getFolder(folderId) {
  try {
    const folder = await sendMessengerRequest('MESSENGER_GET_FOLDER', { folderId });
    return folder;
  } catch (error) {
    await logError(error, `Récupération du dossier ${folderId}`);
    return null;
  }
}

/**
 * Récupère un email par ID
 * @param {string} messageId - L'ID du message
 * @returns {Promise<Object|null>} L'email ou null
 */
export async function getMessage(messageId) {
  try {
    const message = await sendMessengerRequest('MESSENGER_GET_MESSAGE', { messageId });
    return message;
  } catch (error) {
    await logError(error, `Récupération du message ${messageId}`);
    return null;
  }
}

/**
 * Récupère tous les emails des dossiers sélectionnés
 * @param {string[]} selectedFolderIds - Liste des IDs des dossiers à indexer
 * @param {Object} config - Configuration de l'indexation
 * @returns {Promise<Array>} Liste des emails à indexer
 */
export async function fetchEmailsForIndexation(selectedFolderIds, config = null) {
  const currentConfig = config || await getConfig();
  const { indexation: { excludedFolders, maxEmailSize, indexAttachments } } = currentConfig;
  
  const emails = [];
  let processedCount = 0;
  let skippedCount = 0;

  await logInfo(`Début de la récupération des emails pour ${selectedFolderIds.length} dossiers`);

  // Récupérer les informations de tous les dossiers sélectionnés
  for (const folderId of selectedFolderIds) {
    try {
      const folderInfo = await getFolder(folderId);
      
      if (!folderInfo) {
        await logWarn(`Dossier non trouvé: ${folderId}`);
        continue;
      }

      // Vérifier si le dossier est exclu
      if (isFolderExcluded(folderInfo.name || folderInfo.path, excludedFolders)) {
        await logInfo(`Dossier exclu: ${folderInfo.name || folderInfo.path}`);
        continue;
      }

      // Récupérer tous les emails du dossier
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const { messages, total } = await getEmails(folderId, { limit, offset });
        
        for (const message of messages) {
          processedCount++;
          
          // Vérifier la taille de l'email
          if (isEmailTooLarge(message, maxEmailSize)) {
            skippedCount++;
            continue;
          }

          // Récupérer le contenu complet de l'email
          const fullMessage = await getFullEmail(message.id);
          
          if (fullMessage) {
            emails.push({
              id: fullMessage.id,
              folderId: folderId,
              folderName: folderInfo.name || folderInfo.path,
              subject: fullMessage.subject || '',
              body: fullMessage.body || '',
              from: fullMessage.from?.value || '',
              to: fullMessage.to?.value || '',
              cc: fullMessage.cc?.value || '',
              bcc: fullMessage.bcc?.value || '',
              date: fullMessage.date ? new Date(fullMessage.date).getTime() : null,
              lastModified: fullMessage.lastModified ? new Date(fullMessage.lastModified).getTime() : null,
              size: fullMessage.size || 0,
              flags: fullMessage.flags || [],
              tags: fullMessage.tags || [],
              attachments: indexAttachments ? fullMessage.attachments || [] : [],
            });
          }
        }

        offset += limit;
        hasMore = offset < total;
      }

      await logInfo(`Dossier ${folderInfo.name} : ${processedCount} emails traités, ${skippedCount} ignorés`);
    } catch (error) {
      await logError(error, `Traitement du dossier ${folderId}`);
    }
  }

  await logInfo(`Récupération terminée : ${emails.length} emails à indexer, ${skippedCount} ignorés`);
  return emails;
}

/**
 * Récupère les emails modifiés depuis la dernière indexation
 * @param {string[]} selectedFolderIds - Liste des IDs des dossiers
 * @param {Object} lastIndexation - Date de la dernière indexation
 * @param {Object} config - Configuration de l'indexation
 * @returns {Promise<Array>} Liste des emails modifiés
 */
export async function fetchModifiedEmails(selectedFolderIds, lastIndexation, config = null) {
  const currentConfig = config || await getConfig();
  const { indexation: { excludedFolders, maxEmailSize, indexAttachments } } = currentConfig;
  
  const lastIndexationDate = new Date(lastIndexation).getTime();
  const emails = [];

  await logInfo(`Recherche des emails modifiés depuis le ${new Date(lastIndexationDate).toISOString()}`);

  for (const folderId of selectedFolderIds) {
    try {
      const folderInfo = await getFolder(folderId);
      
      if (!folderInfo) {
        await logWarn(`Dossier non trouvé: ${folderId}`);
        continue;
      }

      // Vérifier si le dossier est exclu
      if (isFolderExcluded(folderInfo.name || folderInfo.path, excludedFolders)) {
        continue;
      }

      // Récupérer les emails modifiés depuis la dernière indexation
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const { messages, total } = await getEmails(folderId, { limit, offset });
        
        for (const message of messages) {
          // Vérifier si l'email a été modifié depuis la dernière indexation
          const messageDate = message.date ? new Date(message.date).getTime() : 0;
          const lastModified = message.lastModified ? new Date(message.lastModified).getTime() : messageDate;
          
          if (lastModified <= lastIndexationDate) {
            continue; // Email non modifié depuis la dernière indexation
          }

          // Vérifier la taille de l'email
          if (isEmailTooLarge(message, maxEmailSize)) {
            continue;
          }

          // Récupérer le contenu complet de l'email
          const fullMessage = await getFullEmail(message.id);
          
          if (fullMessage) {
            emails.push({
              id: fullMessage.id,
              folderId: folderId,
              folderName: folderInfo.name || folderInfo.path,
              subject: fullMessage.subject || '',
              body: fullMessage.body || '',
              from: fullMessage.from?.value || '',
              to: fullMessage.to?.value || '',
              date: fullMessage.date ? new Date(fullMessage.date).getTime() : null,
              lastModified: fullMessage.lastModified ? new Date(fullMessage.lastModified).getTime() : null,
              size: fullMessage.size || 0,
            });
          }
        }

        offset += limit;
        hasMore = offset < total;
      }
    } catch (error) {
      await logError(error, `Erreur lors de la récupération des emails modifiés pour le dossier ${folderId}`);
    }
  }

  await logInfo(`Récupération des emails modifiés terminée : ${emails.length} emails trouvés`);
  return emails;
}
