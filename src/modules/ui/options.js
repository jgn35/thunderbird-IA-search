/**
 * Module de la page des options de l'extension
 * @module modules/ui/options
 */

import {
  indexAllEmails,
  indexModifiedEmails,
  clearIndex,
  getIndexStats,
  getIndexationState,
} from '../indexation/indexer.js';

import {
  getConfig,
  saveConfig,
  resetConfig,
  getDefaultConfig,
} from '../../config/storageManager.js';

import { logInfo, logError, logWarn } from '../../utils/logger.js';

/**
 * État de l'application
 * @type {Object}
 */
const appState = {
  currentTab: 'indexation',
  isLoading: false,
  selectedFolders: [],
  allFolders: [],
  accounts: [],
  config: {},
  originalConfig: {},
};

/**
 * Initialise l'application
 */
async function init() {
  try {
    // Charger la configuration
    await loadConfig();
    
    // Charger les comptes et dossiers
    await loadAccountsAndFolders();
    
    // Mettre à jour les statistiques de l'index
    await updateIndexStats();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Charger la configuration dans l'interface
    loadConfigToUI();
    
    console.log('Page des options RAG Search initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    showNotification('Erreur lors de l\'initialisation', 'error');
  }
}

/**
 * Charge la configuration
 */
async function loadConfig() {
  try {
    const config = await getConfig();
    appState.config = config;
    appState.originalConfig = JSON.parse(JSON.stringify(config));
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    const defaultConfig = getDefaultConfig();
    appState.config = defaultConfig;
    appState.originalConfig = JSON.parse(JSON.stringify(defaultConfig));
  }
}

/**
 * Charge les comptes et dossiers
 */
async function loadAccountsAndFolders() {
  try {
    // Récupérer les comptes
    const accounts = await browser.accounts.list();
    appState.accounts = accounts;
    
    // Récupérer tous les dossiers
    let allFolders = [];
    for (const account of accounts) {
      const folders = await browser.folders.list(account.id);
      allFolders = allFolders.concat(folders);
    }
    
    appState.allFolders = allFolders;
    
    // Mettre à jour la liste des dossiers dans l'interface
    updateFoldersList();
    
    // Charger les dossiers sélectionnés depuis la configuration
    const config = await getConfig();
    const selectedFolders = config.selectedFolders || [];
    appState.selectedFolders = selectedFolders;
    
    // Sélectionner les dossiers dans l'interface
    updateSelectedFoldersInUI();
    
  } catch (error) {
    console.error('Erreur lors du chargement des comptes/dossiers:', error);
    showNotification('Erreur lors du chargement des dossiers', 'error');
  }
}

/**
 * Met à jour la liste des dossiers dans l'interface
 */
function updateFoldersList() {
  const selectElement = document.getElementById('selectedFolders');
  if (!selectElement) return;

  // Vider la liste
  selectElement.innerHTML = '';
  
  // Ajouter les dossiers
  appState.allFolders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = `${folder.accountId} - ${folder.name}`;
    selectElement.appendChild(option);
  });
}

/**
 * Met à jour les dossiers sélectionnés dans l'interface
 */
function updateSelectedFoldersInUI() {
  const selectElement = document.getElementById('selectedFolders');
  if (!selectElement) return;

  // Désélectionner tous les éléments
  Array.from(selectElement.options).forEach(option => {
    option.selected = false;
  });
  
  // Sélectionner les dossiers sauvegardés
  appState.selectedFolders.forEach(folderId => {
    const option = selectElement.querySelector(`option[value="${folderId}"]`);
    if (option) {
      option.selected = true;
    }
  });
}

/**
 * Met à jour les statistiques de l'index
 */
async function updateIndexStats() {
  try {
    const stats = await getIndexStats();
    const state = getIndexationState();
    
    // Mettre à jour l'interface
    const indexedCountElement = document.getElementById('indexedCount');
    const lastIndexationElement = document.getElementById('lastIndexation');
    
    if (indexedCountElement) {
      indexedCountElement.textContent = stats.totalIndexed || 0;
    }
    
    if (lastIndexationElement) {
      if (stats.lastIndexation) {
        lastIndexationElement.textContent = new Date(stats.lastIndexation).toLocaleString('fr-FR');
      } else {
        lastIndexationElement.textContent = 'Jamais';
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques:', error);
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Onglets
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
    });
  });

  // Boutons d'indexation
  const indexAllButton = document.getElementById('indexAllButton');
  const indexModifiedButton = document.getElementById('indexModifiedButton');
  const clearIndexButton = document.getElementById('clearIndexButton');
  
  if (indexAllButton) {
    indexAllButton.addEventListener('click', () => startIndexation('all'));
  }
  
  if (indexModifiedButton) {
    indexModifiedButton.addEventListener('click', () => startIndexation('modified'));
  }
  
  if (clearIndexButton) {
    clearIndexButton.addEventListener('click', clearIndexConfirmation);
  }

  // Configuration
  const saveConfigButton = document.getElementById('saveConfigButton');
  const resetConfigButton = document.getElementById('resetConfigButton');
  const cancelButton = document.getElementById('cancelButton');
  const refreshFoldersButton = document.getElementById('refreshFoldersButton');
  
  if (saveConfigButton) {
    saveConfigButton.addEventListener('click', saveConfiguration);
  }
  
  if (resetConfigButton) {
    resetConfigButton.addEventListener('click', resetConfiguration);
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', cancelConfiguration);
  }
  
  if (refreshFoldersButton) {
    refreshFoldersButton.addEventListener('click', refreshFolders);
  }

  // Type de LLM
  const llmTypeSelect = document.getElementById('configLLMType');
  if (llmTypeSelect) {
    llmTypeSelect.addEventListener('change', (e) => {
      const llmType = e.target.value;
      updateLLMConfigSections(llmType);
    });
  }

  // Vérification du statut Ollama
  const checkOllamaStatusButton = document.getElementById('checkOllamaStatus');
  if (checkOllamaStatusButton) {
    checkOllamaStatusButton.addEventListener('click', checkOllamaStatus);
  }

  // Export/Import configuration
  const exportConfigButton = document.getElementById('exportConfigButton');
  const importConfigButton = document.getElementById('importConfigButton');
  
  if (exportConfigButton) {
    exportConfigButton.addEventListener('click', exportConfiguration);
  }
  
  if (importConfigButton) {
    importConfigButton.addEventListener('click', importConfiguration);
  }
}

/**
 * Change d'onglet
 * @param {string} tabName - Nom de l'onglet
 */
function switchTab(tabName) {
  // Mettre à jour l'état
  appState.currentTab = tabName;
  
  // Mettre à jour les boutons d'onglets
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  
  // Mettre à jour les panneaux
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabName);
  });
}

/**
 * Démarre l'indexation
 * @param {'all'|'modified'} type - Type d'indexation
 */
async function startIndexation(type) {
  const selectedFolders = appState.selectedFolders;
  
  if (!selectedFolders || selectedFolders.length === 0) {
    showNotification('Veuillez sélectionner au moins un dossier à indexer', 'warning');
    return;
  }
  
  showLoading(type === 'all' ? 'Indexation complète en cours...' : 'Indexation des emails modifiés...');
  
  try {
    let result;
    
    if (type === 'all') {
      result = await indexAllEmails(selectedFolders);
    } else {
      result = await indexModifiedEmails(selectedFolders);
    }
    
    if (result.success) {
      showNotification(
        `Indexation terminée: ${result.indexed} emails indexés, ${result.skipped} ignorés`,
        'success'
      );
      
      // Mettre à jour les statistiques
      await updateIndexStats();
    } else {
      showNotification(
        result.error || 'Erreur lors de l\'indexation',
        'error'
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'indexation:', error);
    showNotification('Erreur lors de l\'indexation', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Demande de confirmation pour vider l'index
 */
function clearIndexConfirmation() {
  if (confirm('Êtes-vous sûr de vouloir vider l\'index ? Cette action ne peut pas être annulée.')) {
    clearIndexAction();
  }
}

/**
 * Vide l'index
 */
async function clearIndexAction() {
  showLoading('Vidage de l\'index...');
  
  try {
    const result = await clearIndex();
    
    if (result.success) {
      showNotification('Index vidé avec succès', 'success');
      await updateIndexStats();
    } else {
      showNotification(result.error || 'Erreur lors du vidage de l\'index', 'error');
    }
    
  } catch (error) {
    console.error('Erreur lors du vidage de l\'index:', error);
    showNotification('Erreur lors du vidage de l\'index', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Charge la configuration dans l'interface
 */
function loadConfigToUI() {
  const config = appState.config || {};
  
  // Indexation
  const excludedFoldersInput = document.getElementById('excludedFolders');
  if (excludedFoldersInput && config.indexation?.excludedFolders) {
    excludedFoldersInput.value = config.indexation.excludedFolders.join(', ');
  }
  
  const indexAttachmentsCheckbox = document.getElementById('indexAttachments');
  if (indexAttachmentsCheckbox) {
    indexAttachmentsCheckbox.checked = config.indexation?.indexAttachments || false;
  }
  
  const maxEmailSizeInput = document.getElementById('maxEmailSize');
  if (maxEmailSizeInput) {
    maxEmailSizeInput.value = (config.indexation?.maxEmailSize || 10485760) / (1024 * 1024); // Convertir en Mo
  }
  
  // RAG
  const llmTypeSelect = document.getElementById('configLLMType');
  if (llmTypeSelect) {
    llmTypeSelect.value = config.rag?.type || 'api_externe';
    updateLLMConfigSections(llmTypeSelect.value);
  }
  
  // API Externe
  const apiEndpointInput = document.getElementById('apiEndpoint');
  if (apiEndpointInput && config.rag?.api?.endpoint) {
    apiEndpointInput.value = config.rag.api.endpoint;
  }
  
  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput && config.rag?.api?.apiKey) {
    apiKeyInput.value = config.rag.api.apiKey;
  }
  
  const apiModelSelect = document.getElementById('apiModel');
  if (apiModelSelect && config.rag?.api?.model) {
    apiModelSelect.value = config.rag.api.model;
  }
  
  const embeddingEndpointInput = document.getElementById('embeddingEndpoint');
  if (embeddingEndpointInput && config.rag?.api?.embeddingEndpoint) {
    embeddingEndpointInput.value = config.rag.api.embeddingEndpoint;
  }
  
  // Ollama
  const ollamaUrlInput = document.getElementById('ollamaUrl');
  if (ollamaUrlInput && config.rag?.local?.url) {
    ollamaUrlInput.value = config.rag.local.url;
  }
  
  const ollamaModelInput = document.getElementById('ollamaModel');
  if (ollamaModelInput && config.rag?.local?.model) {
    ollamaModelInput.value = config.rag.local.model;
  }
  
  // Paramètres RAG avancés
  const ragTopKInput = document.getElementById('ragTopK');
  if (ragTopKInput && config.rag?.topK) {
    ragTopKInput.value = config.rag.topK;
  }
  
  const ragTemperatureInput = document.getElementById('ragTemperature');
  if (ragTemperatureInput && config.rag?.temperature) {
    ragTemperatureInput.value = config.rag.temperature;
  }
  
  // Paramètres avancés
  const chunkSizeInput = document.getElementById('chunkSize');
  if (chunkSizeInput && config.indexation?.chunkSize) {
    chunkSizeInput.value = config.indexation.chunkSize;
  }
  
  const chunkOverlapInput = document.getElementById('chunkOverlap');
  if (chunkOverlapInput && config.indexation?.chunkOverlap) {
    chunkOverlapInput.value = config.indexation.chunkOverlap;
  }
  
  const enableDebugLogsCheckbox = document.getElementById('enableDebugLogs');
  if (enableDebugLogsCheckbox) {
    enableDebugLogsCheckbox.checked = config.debug?.enableDebugLogs || false;
  }
}

/**
 * Met à jour les sections de configuration LLM
 * @param {string} llmType - Type de LLM
 */
function updateLLMConfigSections(llmType) {
  const apiConfigSection = document.getElementById('apiConfigSection');
  const ollamaConfigSection = document.getElementById('ollamaConfigSection');
  
  if (apiConfigSection && ollamaConfigSection) {
    if (llmType === 'api_externe') {
      apiConfigSection.style.display = 'block';
      ollamaConfigSection.style.display = 'none';
    } else {
      apiConfigSection.style.display = 'none';
      ollamaConfigSection.style.display = 'block';
    }
  }
}

/**
 * Sauvegarde la configuration
 */
async function saveConfiguration() {
  try {
    const config = {};
    
    // Indexation
    const excludedFoldersInput = document.getElementById('excludedFolders');
    if (excludedFoldersInput) {
      const excludedFolders = excludedFoldersInput.value
        .split(',')
        .map(f => f.trim())
        .filter(f => f);
      
      config.indexation = {
        ...config.indexation,
        excludedFolders,
      };
    }
    
    const indexAttachmentsCheckbox = document.getElementById('indexAttachments');
    if (indexAttachmentsCheckbox) {
      config.indexation = {
        ...config.indexation,
        indexAttachments: indexAttachmentsCheckbox.checked,
      };
    }
    
    const maxEmailSizeInput = document.getElementById('maxEmailSize');
    if (maxEmailSizeInput) {
      const maxEmailSize = parseInt(maxEmailSizeInput.value) * 1024 * 1024; // Convertir en octets
      config.indexation = {
        ...config.indexation,
        maxEmailSize,
      };
    }
    
    // Dossiers sélectionnés
    const selectedFoldersSelect = document.getElementById('selectedFolders');
    if (selectedFoldersSelect) {
      const selectedOptions = Array.from(selectedFoldersSelect.selectedOptions);
      config.selectedFolders = selectedOptions.map(option => option.value);
      appState.selectedFolders = config.selectedFolders;
    }
    
    // RAG
    const llmTypeSelect = document.getElementById('configLLMType');
    if (llmTypeSelect) {
      config.rag = {
        ...config.rag,
        type: llmTypeSelect.value,
      };
    }
    
    // API Externe
    const apiEndpointInput = document.getElementById('apiEndpoint');
    const apiKeyInput = document.getElementById('apiKey');
    const apiModelSelect = document.getElementById('apiModel');
    const embeddingEndpointInput = document.getElementById('embeddingEndpoint');
    
    if (apiEndpointInput || apiKeyInput || apiModelSelect || embeddingEndpointInput) {
      config.rag = {
        ...config.rag,
        api: {
          endpoint: apiEndpointInput?.value || '',
          apiKey: apiKeyInput?.value || '',
          model: apiModelSelect?.value || 'mistral-tiny',
          embeddingEndpoint: embeddingEndpointInput?.value || '',
        },
      };
    }
    
    // Ollama
    const ollamaUrlInput = document.getElementById('ollamaUrl');
    const ollamaModelInput = document.getElementById('ollamaModel');
    
    if (ollamaUrlInput || ollamaModelInput) {
      config.rag = {
        ...config.rag,
        local: {
          url: ollamaUrlInput?.value || '',
          model: ollamaModelInput?.value || 'mistral-7b',
        },
      };
    }
    
    // Paramètres RAG avancés
    const ragTopKInput = document.getElementById('ragTopK');
    if (ragTopKInput) {
      config.rag = {
        ...config.rag,
        topK: parseInt(ragTopKInput.value) || 5,
      };
    }
    
    const ragTemperatureInput = document.getElementById('ragTemperature');
    if (ragTemperatureInput) {
      config.rag = {
        ...config.rag,
        temperature: parseFloat(ragTemperatureInput.value) || 0.7,
      };
    }
    
    // Paramètres avancés
    const chunkSizeInput = document.getElementById('chunkSize');
    if (chunkSizeInput) {
      config.indexation = {
        ...config.indexation,
        chunkSize: parseInt(chunkSizeInput.value) || 512,
      };
    }
    
    const chunkOverlapInput = document.getElementById('chunkOverlap');
    if (chunkOverlapInput) {
      config.indexation = {
        ...config.indexation,
        chunkOverlap: parseInt(chunkOverlapInput.value) || 100,
      };
    }
    
    const enableDebugLogsCheckbox = document.getElementById('enableDebugLogs');
    if (enableDebugLogsCheckbox) {
      config.debug = {
        ...config.debug,
        enableDebugLogs: enableDebugLogsCheckbox.checked,
      };
    }
    
    // Sauvegarder la configuration
    await saveConfig(config);
    appState.config = config;
    appState.originalConfig = JSON.parse(JSON.stringify(config));
    
    showNotification('Configuration sauvegardée avec succès', 'success');
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error);
    showNotification('Erreur lors de la sauvegarde de la configuration', 'error');
  }
}

/**
 * Annule les modifications de la configuration
 */
function cancelConfiguration() {
  // Recharger la configuration originale
  appState.config = JSON.parse(JSON.stringify(appState.originalConfig));
  loadConfigToUI();
  showNotification('Modifications annulées', 'info');
}

/**
 * Réinitialise la configuration
 */
async function resetConfiguration() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser la configuration aux valeurs par défaut ?')) {
    try {
      const defaultConfig = getDefaultConfig();
      await saveConfig(defaultConfig);
      appState.config = defaultConfig;
      appState.originalConfig = JSON.parse(JSON.stringify(defaultConfig));
      loadConfigToUI();
      showNotification('Configuration réinitialisée', 'success');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      showNotification('Erreur lors de la réinitialisation', 'error');
    }
  }
}

/**
 * Rafraîchit la liste des dossiers
 */
async function refreshFolders() {
  showLoading('Rafraîchissement des dossiers...');
  
  try {
    await loadAccountsAndFolders();
    showNotification('Liste des dossiers rafraîchie', 'success');
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des dossiers:', error);
    showNotification('Erreur lors du rafraîchissement des dossiers', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Vérifie le statut d'Ollama
 */
async function checkOllamaStatus() {
  const statusElement = document.getElementById('ollamaStatus');
  if (!statusElement) return;
  
  try {
    statusElement.textContent = 'Vérification...';
    statusElement.style.color = '';
    
    // Importer dynamiquement le client Ollama
    const { checkOllamaStatus: checkStatus } = await import('../generation/ollamaClient.js');
    const result = await checkStatus();
    
    if (result.isRunning) {
      statusElement.textContent = '✓ Ollama est en cours d\'exécution';
      statusElement.style.color = 'var(--success-color)';
      showNotification('Ollama est en cours d\'exécution', 'success');
    } else {
      statusElement.textContent = '✗ Ollama n\'est pas accessible';
      statusElement.style.color = 'var(--danger-color)';
      showNotification(result.error || 'Ollama n\'est pas accessible', 'error');
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification du statut Ollama:', error);
    statusElement.textContent = '✗ Erreur de vérification';
    statusElement.style.color = 'var(--danger-color)';
    showNotification('Erreur lors de la vérification du statut Ollama', 'error');
  }
}

/**
 * Exporte la configuration
 */
async function exportConfiguration() {
  try {
    const config = appState.config || await getConfig();
    const configStr = JSON.stringify(config, null, 2);
    
    // Créer un blob et un lien de téléchargement
    const blob = new Blob([configStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag-search-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Configuration exportée avec succès', 'success');
  } catch (error) {
    console.error('Erreur lors de l\'export de la configuration:', error);
    showNotification('Erreur lors de l\'export de la configuration', 'error');
  }
}

/**
 * Importe la configuration
 */
async function importConfiguration() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);
          
          // Valider la configuration
          if (!isValidConfig(config)) {
            showNotification('Le fichier de configuration n\'est pas valide', 'error');
            return;
          }
          
          // Sauvegarder la configuration
          await saveConfig(config);
          appState.config = config;
          appState.originalConfig = JSON.parse(JSON.stringify(config));
          loadConfigToUI();
          
          showNotification('Configuration importée avec succès', 'success');
        } catch (parseError) {
          console.error('Erreur lors de l\'analyse du fichier:', parseError);
          showNotification('Erreur lors de l\'analyse du fichier JSON', 'error');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Erreur lors de l\'import de la configuration:', error);
      showNotification('Erreur lors de l\'import de la configuration', 'error');
    }
  });
  
  input.click();
}

/**
 * Valide la configuration importée
 * @param {Object} config - Configuration à valider
 * @returns {boolean} True si la configuration est valide
 */
function isValidConfig(config) {
  // Vérifier que c'est un objet
  if (typeof config !== 'object' || config === null) {
    return false;
  }
  
  // Vérifier les sections principales
  if (config.indexation && typeof config.indexation !== 'object') {
    return false;
  }
  
  if (config.rag && typeof config.rag !== 'object') {
    return false;
  }
  
  return true;
}

/**
 * Affiche l'indicateur de chargement
 * @param {string} text - Texte à afficher
 */
function showLoading(text) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const loadingText = document.getElementById('loadingText');
  
  if (loadingIndicator && loadingText) {
    loadingText.textContent = text;
    loadingIndicator.style.display = 'flex';
  }
  
  appState.isLoading = true;
}

/**
 * Masque l'indicateur de chargement
 */
function hideLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  appState.isLoading = false;
}

/**
 * Affiche une notification
 * @param {string} message - Message de la notification
 * @param {'success'|'error'|'warning'|'info'} type - Type de notification
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Supprimer la notification après 5 secondes
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Échappe les caractères HTML pour éviter les attaques XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialiser l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', init);
