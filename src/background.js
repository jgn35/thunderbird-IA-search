/**
 * Script de fond pour l'extension Thunderbird RAG Search
 * Gère les événements en arrière-plan et la communication entre les modules
 * @module background
 */

import { logInfo, logError, logWarn } from './utils/logger.js';
import { getConfig } from './config/storageManager.js';
import {
  indexEmail,
  unindexEmail,
  getIndexStats,
  initIndexer,
} from './modules/indexation/indexer.js';

/**
 * Initialise le script de fond
 */
async function initBackground() {
  try {
    await logInfo('Initialisation du script de fond');
    
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
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Indique que sendResponse sera appelé de manière asynchrone
  });

  // Écouter les changements dans les emails
  if (messenger.messages) {
    messenger.messages.onCreated.addListener((message) => {
      handleMessageCreated(message);
    });

    messenger.messages.onModified.addListener((message) => {
      handleMessageModified(message);
    });

    messenger.messages.onDeleted.addListener((messageIds) => {
      handleMessagesDeleted(messageIds);
    });

    messenger.messages.onMoved.addListener((messageIds, sourceFolderId, destinationFolderId) => {
      handleMessagesMoved(messageIds, sourceFolderId, destinationFolderId);
    });
  }

  // Écouter les changements dans les dossiers
  if (messenger.folders) {
    messenger.folders.onCreated.addListener((folder) => {
      handleFolderCreated(folder);
    });

    messenger.folders.onDeleted.addListener((folderId) => {
      handleFolderDeleted(folderId);
    });

    messenger.folders.onModified.addListener((folder) => {
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
    
    // Récupérer les comptes
    const accounts = await messenger.accounts.list();
    
    // Récupérer tous les dossiers pour chaque compte
    let allFolders = [];
    for (const account of accounts) {
      try {
        const folders = await messenger.folders.list(account.id);
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
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de l'email est sélectionné pour l'indexation
    if (selectedFolders.includes(message.folderId)) {
      // Récupérer le contenu complet de l'email
      const fullEmail = await messenger.messages.getFull(message.id);
      
      if (fullEmail) {
        // Indexer le nouvel email
        await indexEmail({
          id: fullEmail.id,
          folderId: fullEmail.folderId,
          folderName: '', // À récupérer
          subject: fullEmail.subject || '',
          body: fullEmail.body || '',
          from: fullEmail.from?.value || '',
          to: fullEmail.to?.value || '',
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
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de l'email est sélectionné pour l'indexation
    if (selectedFolders.includes(message.folderId)) {
      // Récupérer le contenu complet de l'email
      const fullEmail = await messenger.messages.getFull(message.id);
      
      if (fullEmail) {
        // Réindexer l'email modifié
        await indexEmail({
          id: fullEmail.id,
          folderId: fullEmail.folderId,
          folderName: '', // À récupérer
          subject: fullEmail.subject || '',
          body: fullEmail.body || '',
          from: fullEmail.from?.value || '',
          to: fullEmail.to?.value || '',
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
    
    // Récupérer la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    
    // Vérifier si le dossier de destination est sélectionné pour l'indexation
    const destinationSelected = selectedFolders.includes(destinationFolderId);
    const sourceSelected = selectedFolders.includes(sourceFolderId);
    
    for (const messageId of messageIds) {
      if (destinationSelected && !sourceSelected) {
        // L'email est déplacé vers un dossier indexé : l'indexer
        const fullEmail = await messenger.messages.getFull(messageId);
        if (fullEmail) {
          await indexEmail({
            id: fullEmail.id,
            folderId: destinationFolderId,
            folderName: '', // À récupérer
            subject: fullEmail.subject || '',
            body: fullEmail.body || '',
            from: fullEmail.from?.value || '',
            to: fullEmail.to?.value || '',
            date: fullEmail.date ? new Date(fullEmail.date).getTime() : null,
            lastModified: fullEmail.lastModified ? new Date(fullEmail.lastModified).getTime() : null,
          });
        }
      } else if (!destinationSelected && sourceSelected) {
        // L'email est déplacé hors d'un dossier indexé : le désindexer
        await unindexEmail(messageId);
      }
      // Si les deux dossiers sont indexés ou aucun ne l'est, pas besoin de faire quoi que ce soit
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
      // Indexer tous les emails du nouveau dossier
      // (L'indexation complète sera gérée par l'interface utilisateur)
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
        // Importer dynamiquement pour éviter les dépendances circulaires
        const { indexModifiedEmails } = await import('./modules/indexation/indexer.js');
        await indexModifiedEmails(selectedFolders);
      }
    } catch (error) {
      await logError(error, 'Vérification périodique des emails modifiés');
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Initialiser le script de fond
initBackground();
