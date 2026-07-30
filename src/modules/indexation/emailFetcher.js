/**
 * Module pour la récupération des emails depuis Thunderbird
 * @module modules/indexation/emailFetcher
 * 
 * NOTE: Ce module est maintenant appelé UNIQUEMENT depuis background.js.
 * Il peut donc utiliser directement l'API messenger sans passer par des messages.
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { isFolderExcluded, isEmailTooLarge } from '../../utils/helpers.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Obtient l'API messenger disponible
 * Dans Thunderbird, on peut utiliser soit browser.messenger soit messenger (objet global)
 * @returns {Object} L'API messenger
 */
function getMessengerAPI() {
  // Essayer messenger (objet global dans les modules privilégiés)
  if (typeof messenger !== 'undefined' && messenger) {
    return messenger;
  }
  
  // Essayer browser.messenger (API standard WebExtension)
  if (typeof browser !== 'undefined' && browser && browser.messenger) {
    return browser.messenger;
  }
  
  throw new Error('Aucune API messenger disponible');
}

/**
 * Récupère la liste de tous les comptes email
 * @returns {Promise<Array>} Liste des comptes
 */
export async function getAccounts() {
  try {
    const messengerAPI = getMessengerAPI();
    const accounts = await messengerAPI.accounts.list();
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
    const messengerAPI = getMessengerAPI();
    const folders = await messengerAPI.folders.query({ accountId });
    await logInfo(`Récupération de ${folders.length} dossiers pour le compte ${accountId}`);
    return folders;
  } catch (error) {
    await logError(error, `Récupération des dossiers pour le compte ${accountId}`);
    return [];
  }
}

/**
 * Récupère tous les messages d'un dossier en utilisant la pagination
 * @param {string} folderId - L'ID du dossier
 * @param {Object} [options] - Options de filtrage
 * @param {number} [options.limit] - Limite de résultats (non utilisé avec la pagination)
 * @param {number} [options.offset] - Décalage (non utilisé avec la pagination)
 * @returns {Promise<Object>} Objet contenant la liste des emails et le total
 */
export async function getEmails(folderId, options = {}) {
  try {
    const messengerAPI = getMessengerAPI();
    
    // Utiliser la pagination selon la documentation Thunderbird
    // messages.list() retourne des pages de messages
    let page = await messengerAPI.messages.list(folderId);
    const allMessages = [];
    
    // Traiter la première page
    if (page.messages) {
      allMessages.push(...page.messages);
    }
    
    // Continuer avec les pages suivantes tant qu'il y a un id
    while (page.id) {
      page = await messengerAPI.messages.continueList(page.id);
      if (page.messages) {
        allMessages.push(...page.messages);
      }
    }
    
    await logInfo(`Récupération de ${allMessages.length} emails dans le dossier ${folderId}`);
    
    return {
      messages: allMessages,
      total: allMessages.length,
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
    const messengerAPI = getMessengerAPI();
    const message = await messengerAPI.messages.getFull(messageId);
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
    const messengerAPI = getMessengerAPI();
    const folder = await messengerAPI.folders.get(folderId);
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
    const messengerAPI = getMessengerAPI();
    const message = await messengerAPI.messages.get(messageId);
    return message;
  } catch (error) {
    await logError(error, `Récupération du message ${messageId}`);
    return null;
  }
}

/**
 * Vérifie si un email existe
 * @param {string} messageId - L'ID du message
 * @returns {Promise<boolean>} True si l'email existe, false sinon
 */
export async function emailExists(messageId) {
  try {
    const messengerAPI = getMessengerAPI();
    const message = await messengerAPI.messages.get(messageId);
    return !!message;
  } catch (error) {
    await logError(error, `Vérification de l'existence de l'email ${messageId}`);
    return false;
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

      // Récupérer tous les emails du dossier (avec pagination automatique)
      const { messages } = await getEmails(folderId);
      
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
      const { messages } = await getEmails(folderId);
      
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
    } catch (error) {
      await logError(error, `Erreur lors de la récupération des emails modifiés pour le dossier ${folderId}`);
    }
  }

  await logInfo(`Récupération des emails modifiés terminée : ${emails.length} emails trouvés`);
  return emails;
}
