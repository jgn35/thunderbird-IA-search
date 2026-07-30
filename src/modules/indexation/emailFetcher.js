/**
 * Module pour la récupération des emails depuis Thunderbird
 * @module modules/indexation/emailFetcher
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { isFolderExcluded, isEmailTooLarge } from '../../utils/helpers.js';
import { getConfig } from '../../config/storageManager.js';

/**
 * Récupère la liste de tous les comptes email
 * @returns {Promise<Array>} Liste des comptes
 */
export async function getAccounts() {
  try {
    const accounts = await messenger.accounts.list();
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
    const folders = await messenger.folders.list(accountId);
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
    const messages = await messenger.messages.list(folderId, {
      limit,
      offset,
    });
    
    await logInfo(`Récupération de ${messages.messages.length} emails dans le dossier ${folderId}`);
    
    return {
      messages: messages.messages,
      total: messages.total,
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
    const message = await messenger.messages.getFull(messageId);
    return message;
  } catch (error) {
    await logError(error, `Récupération de l'email ${messageId}`);
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

  for (const folderId of selectedFolderIds) {
    try {
      // Récupérer les informations du dossier pour vérifier s'il est exclu
      const folderInfo = await messenger.folders.get(folderId);
      
      if (isFolderExcluded(folderInfo.name, excludedFolders)) {
        await logWarn(`Dossier exclu : ${folderInfo.name} (ID: ${folderId})`);
        continue;
      }

      // Récupérer tous les emails du dossier (par pages)
      let offset = 0;
      const limit = 50; // Limite par page
      let hasMore = true;

      while (hasMore) {
        const { messages, total } = await getEmails(folderId, { limit, offset });
        
        for (const message of messages) {
          processedCount++;
          
          // Récupérer le contenu complet de l'email
          const fullEmail = await getFullEmail(message.id);
          
          if (!fullEmail) {
            skippedCount++;
            continue;
          }

          // Vérifier la taille de l'email
          const emailSize = new Blob([
            fullEmail.subject || '',
            fullEmail.body || '',
            fullEmail.from?.value || '',
            fullEmail.to?.value || '',
          ]).size;

          if (isEmailTooLarge(fullEmail.body, maxEmailSize)) {
            await logWarn(`Email trop grand (${emailSize} octets) : ${fullEmail.id}`);
            skippedCount++;
            continue;
          }

          // Préparer les données de l'email pour l'indexation
          const emailData = {
            id: fullEmail.id,
            folderId: folderId,
            folderName: folderInfo.name,
            subject: fullEmail.subject || '',
            body: fullEmail.body || '',
            from: fullEmail.from?.value || '',
            to: fullEmail.to?.value || '',
            date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
            lastModified: fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null,
            attachments: indexAttachments ? fullEmail.attachments || [] : [],
            size: emailSize,
          };

          emails.push(emailData);
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
      const folderInfo = await messenger.folders.get(folderId);
      
      if (isFolderExcluded(folderInfo.name, excludedFolders)) {
        continue;
      }

      // Récupérer tous les emails du dossier
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const { messages, total } = await getEmails(folderId, { limit, offset });
        
        for (const message of messages) {
          const fullEmail = await getFullEmail(message.id);
          
          if (!fullEmail) continue;

          // Vérifier si l'email a été modifié depuis la dernière indexation
          const lastModified = fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null;
          
          if (lastModified && lastModified > lastIndexationDate) {
            const emailSize = new Blob([
              fullEmail.subject || '',
              fullEmail.body || '',
            ]).size;

            if (isEmailTooLarge(fullEmail.body, maxEmailSize)) {
              continue;
            }

            const emailData = {
              id: fullEmail.id,
              folderId: folderId,
              folderName: folderInfo.name,
              subject: fullEmail.subject || '',
              body: fullEmail.body || '',
              from: fullEmail.from?.value || '',
              to: fullEmail.to?.value || '',
              date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
              lastModified: lastModified,
              attachments: indexAttachments ? fullEmail.attachments || [] : [],
              size: emailSize,
            };

            emails.push(emailData);
          }
        }

        offset += limit;
        hasMore = offset < total;
      }
    } catch (error) {
      await logError(error, `Recherche des emails modifiés dans ${folderId}`);
    }
  }

  await logInfo(`Trouvés ${emails.length} emails modifiés depuis la dernière indexation`);
  return emails;
}

/**
 * Vérifie si un email existe toujours
 * @param {string} messageId - L'ID du message
 * @returns {Promise<boolean>} Vrai si l'email existe
 */
export async function emailExists(messageId) {
  try {
    const message = await messenger.messages.get(messageId);
    return !!message;
  } catch (error) {
    return false;
  }
}
