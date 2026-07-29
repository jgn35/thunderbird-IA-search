/**
 * Module principal de l'interface utilisateur (barre latérale)
 * @module modules/ui/sidebar
 */

import {
  indexAllEmails,
  indexModifiedEmails,
  clearIndex,
  getIndexStats,
  getIndexationState,
} from '../indexation/indexer.js';

import {
  search,
  advancedSearch,
  getSearchSuggestions,
} from '../recherche/searchEngine.js';

import {
  performRAG,
  checkRAGConfig,
  getCurrentLLMType,
  setLLMType,
} from '../generation/ragOrchestrator.js';

import {
  getConfig,
  saveConfig,
  resetConfig,
  getLogs,
  clearLogs,
  exportLogsToFile,
} from '../../config/storageManager.js';

import { logInfo, logError, logWarn } from '../../utils/logger.js';

/**
 * État de l'application
 * @type {Object}
 */
const appState = {
  currentTab: 'search',
  isLoading: false,
  selectedFolders: [],
  allFolders: [],
  accounts: [],
};

/**
 * Initialise l'application
 */
async function init() {
  try {
    // Charger la configuration
    await loadConfig();
    
    // Charger les comptes et dossiers via le background script
    await loadAccountsAndFolders();
    
    // Mettre à jour les statistiques de l'index
    await updateIndexStats();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Mettre à jour l'interface en fonction de la configuration
    updateUIFromConfig();
    
    // Vérifier la configuration RAG
    await checkAndUpdateRAGStatus();
    
    console.log('Extension RAG Search initialisée avec succès');
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
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    appState.config = {};
  }
}

/**
 * Charge les comptes et dossiers via le background script
 */
async function loadAccountsAndFolders() {
  try {
    showLoading('Chargement des comptes et dossiers...');
    
    // Envoyer un message au background script pour récupérer les comptes et dossiers
    const response = await browser.runtime.sendMessage({ type: 'GET_ACCOUNTS_AND_FOLDERS' });
    
    if (response && response.success) {
      appState.accounts = response.accounts || [];
      appState.allFolders = response.folders || [];
      
      // Mettre à jour la liste des dossiers dans l'interface
      updateFoldersList();
      
      // Charger les dossiers sélectionnés depuis la configuration
      const config = await getConfig();
      const selectedFolders = config.selectedFolders || [];
      appState.selectedFolders = selectedFolders;
      
      // Sélectionner les dossiers dans l'interface
      updateSelectedFoldersInUI();
    } else {
      console.error('Erreur lors de la récupération des comptes/dossiers:', response?.error);
      showNotification('Erreur lors du chargement des dossiers', 'error');
    }
    
  } catch (error) {
    console.error('Erreur lors du chargement des comptes/dossiers:', error);
    showNotification('Erreur lors du chargement des dossiers', 'error');
  } finally {
    hideLoading();
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
  
  // Vérifier s'il y a des dossiers
  if (!appState.allFolders || appState.allFolders.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Aucun dossier disponible';
    option.disabled = true;
    selectElement.appendChild(option);
    return;
  }
  
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
    const isIndexingElement = document.getElementById('isIndexing');
    
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
    
    if (isIndexingElement) {
      isIndexingElement.textContent = state.isIndexing ? 'Oui' : 'Non';
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

  // Recherche
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  
  if (searchInput && searchButton) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
    
    searchButton.addEventListener('click', performSearch);
  }

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
  
  if (saveConfigButton) {
    saveConfigButton.addEventListener('click', saveConfiguration);
  }
  
  if (resetConfigButton) {
    resetConfigButton.addEventListener('click', resetConfiguration);
  }

  // Type de LLM
  const llmTypeSelect = document.getElementById('llmTypeSelect');
  if (llmTypeSelect) {
    llmTypeSelect.addEventListener('change', (e) => {
      const llmType = e.target.value;
      setLLMType(llmType);
    });
  }

  // Vérification du statut Ollama
  const checkOllamaStatusButton = document.getElementById('checkOllamaStatus');
  if (checkOllamaStatusButton) {
    checkOllamaStatusButton.addEventListener('click', checkOllamaStatus);
  }

  // Logs
  const refreshLogsButton = document.getElementById('refreshLogsButton');
  const clearLogsButton = document.getElementById('clearLogsButton');
  const exportLogsButton = document.getElementById('exportLogsButton');
  
  if (refreshLogsButton) {
    refreshLogsButton.addEventListener('click', displayLogs);
  }
  
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', clearLogsConfirmation);
  }
  
  if (exportLogsButton) {
    exportLogsButton.addEventListener('click', exportLogs);
  }

  // Suggestions de recherche
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value;
      if (query.length >= 2) {
        await showSearchSuggestions(query);
      }
    });
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
  
  // Charger les données spécifiques à l'onglet
  if (tabName === 'logs') {
    displayLogs();
  } else if (tabName === 'config') {
    loadConfigToUI();
  }
}

/**
 * Effectue une recherche
 */
async function performSearch() {
  const searchInput = document.getElementById('searchInput');
  const useRAGCheckbox = document.getElementById('useRAGCheckbox');
  const resultsContainer = document.getElementById('resultsContainer');
  const ragAnswerSection = document.getElementById('ragAnswerSection');
  
  if (!searchInput) return;
  
  const query = searchInput.value.trim();
  if (!query) {
    showNotification('Veuillez entrer une requête de recherche', 'warning');
    return;
  }
  
  // Afficher l'indicateur de chargement
  showLoading('Recherche en cours...');
  
  try {
    const useRAG = useRAGCheckbox && useRAGCheckbox.checked;
    
    if (useRAG) {
      // Effectuer une recherche RAG
      const ragResult = await performRAG(query);
      
      if (ragResult.success) {
        // Afficher les résultats de la recherche
        displaySearchResults(ragResult.context, query);
        
        // Afficher la réponse RAG
        if (ragAnswerSection) {
          ragAnswerSection.style.display = 'block';
        }
        
        const ragAnswerElement = document.getElementById('ragAnswer');
        if (ragAnswerElement) {
          ragAnswerElement.textContent = ragResult.answer;
        }
        
        const answerModelElement = document.getElementById('answerModel');
        if (answerModelElement) {
          answerModelElement.textContent = `Modèle: ${ragResult.model}`;
        }
        
        const answerDurationElement = document.getElementById('answerDuration');
        if (answerDurationElement) {
          answerDurationElement.textContent = `Temps: ${ragResult.duration}ms`;
        }
      } else {
        showNotification(ragResult.error || 'Erreur lors du RAG', 'error');
        
        // Afficher les résultats de la recherche simple
        const searchResult = await search(query);
        displaySearchResults(searchResult.results, query);
        
        if (ragAnswerSection) {
          ragAnswerSection.style.display = 'none';
        }
      }
    } else {
      // Effectuer une recherche simple
      const searchResult = await search(query);
      
      if (searchResult.success) {
        displaySearchResults(searchResult.results, query);
      } else {
        showNotification(searchResult.error || 'Aucun résultat trouvé', 'warning');
      }
      
      if (ragAnswerSection) {
        ragAnswerSection.style.display = 'none';
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    showNotification('Erreur lors de la recherche', 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Affiche les résultats de la recherche
 * @param {Array} results - Liste des résultats
 * @param {string} query - La requête de recherche
 */
function displaySearchResults(results, query) {
  const resultsContainer = document.getElementById('resultsContainer');
  if (!resultsContainer) return;
  
  if (!results || results.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">Aucun résultat trouvé.</p>';
    return;
  }
  
  let html = '';
  for (const result of results) {
    const date = new Date(result.date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const snippet = result.body.substring(0, 200) + (result.body.length > 200 ? '...' : '');
    
    html += `
      <div class="result-item">
        <div class="subject">${escapeHtml(result.subject || 'Sans sujet')}</div>
        <div class="meta">
          <span>${escapeHtml(result.from)}</span>
          <span>${date}</span>
          <span>${escapeHtml(result.folderName)}</span>
        </div>
        <div class="snippet">${escapeHtml(snippet)}</div>
        <div class="score">Score: ${result.score ? result.score.toFixed(2) : 'N/A'}</div>
      </div>
    `;
  }
  
  resultsContainer.innerHTML = html;
}

/**
 * Affiche les suggestions de recherche
 * @param {string} query - La requête partielle
 */
async function showSearchSuggestions(query) {
  // Pour l'instant, on n'affiche pas de suggestions dans l'UI
  // Mais on pourrait ajouter un dropdown plus tard
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

  // Dossiers sélectionnés
  updateSelectedFoldersInUI();
  
  // RAG
  const llmTypeSelectInSearch = document.getElementById('llmTypeSelect');
  if (llmTypeSelectInSearch) {
    llmTypeSelectInSearch.value = config.rag?.type || 'api_externe';
  }
  
  // Cochez la case RAG par défaut
  const useRAGCheckbox = document.getElementById('useRAGCheckbox');
  if (useRAGCheckbox) {
    useRAGCheckbox.checked = true;
  }
}

/**
 * Met à jour l'interface en fonction de la configuration
 */
function updateUIFromConfig() {
  const config = appState.config || {};
  
  // Type de LLM dans la recherche
  const llmTypeSelectInSearch = document.getElementById('llmTypeSelect');
  if (llmTypeSelectInSearch) {
    llmTypeSelectInSearch.value = config.rag?.type || 'api_externe';
  }
  
  // Cochez la case RAG par défaut
  const useRAGCheckbox = document.getElementById('useRAGCheckbox');
  if (useRAGCheckbox) {
    useRAGCheckbox.checked = true;
  }
}

/**
 * Vérifie et met à jour le statut de la configuration RAG
 */
async function checkAndUpdateRAGStatus() {
  try {
    const ragConfig = await checkRAGConfig();
    
    // Mettre à jour l'interface en fonction du statut
    if (!ragConfig.isValid) {
      showNotification(
        `Configuration RAG incomplète : ${ragConfig.error}`,
        'warning'
      );
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification de la configuration RAG:', error);
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
 * Affiche les logs
 */
async function displayLogs() {
  const logsContentElement = document.getElementById('logsContent');
  if (!logsContentElement) return;
  
  try {
    logsContentElement.textContent = 'Chargement des logs...';
    
    const logs = await getLogs();
    
    if (logs.length === 0) {
      logsContentElement.textContent = 'Aucun log disponible.';
    } else {
      logsContentElement.textContent = logs.join('\n');
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'affichage des logs:', error);
    logsContentElement.textContent = 'Erreur lors du chargement des logs.';
  }
}

/**
 * Demande de confirmation pour effacer les logs
 */
function clearLogsConfirmation() {
  if (confirm('Êtes-vous sûr de vouloir effacer tous les logs ?')) {
    clearLogsAction();
  }
}

/**
 * Efface les logs
 */
async function clearLogsAction() {
  try {
    await clearLogs();
    showNotification('Logs effacés avec succès', 'success');
    displayLogs();
  } catch (error) {
    console.error('Erreur lors de l\'effacement des logs:', error);
    showNotification('Erreur lors de l\'effacement des logs', 'error');
  }
}

/**
 * Exporte les logs
 */
async function exportLogs() {
  try {
    await exportLogsToFile();
    showNotification('Logs exportés avec succès', 'success');
  } catch (error) {
    console.error('Erreur lors de l\'export des logs:', error);
    showNotification('Erreur lors de l\'export des logs', 'error');
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
    
    if (apiEndpointInput || apiKeyInput || apiModelSelect) {
      config.rag = {
        ...config.rag,
        api: {
          endpoint: apiEndpointInput?.value || '',
          apiKey: apiKeyInput?.value || '',
          model: apiModelSelect?.value || 'mistral-tiny',
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
    
    // Sauvegarder la configuration
    await saveConfig(config);
    appState.config = config;
    
    showNotification('Configuration sauvegardée avec succès', 'success');
    
    // Vérifier la configuration RAG
    await checkAndUpdateRAGStatus();
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error);
    showNotification('Erreur lors de la sauvegarde de la configuration', 'error');
  }
}

/**
 * Réinitialise la configuration
 */
async function resetConfiguration() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser la configuration aux valeurs par défaut ?')) {
    try {
      await resetConfig();
      await loadConfig();
      updateUIFromConfig();
      loadConfigToUI();
      showNotification('Configuration réinitialisée', 'success');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      showNotification('Erreur lors de la réinitialisation', 'error');
    }
  }
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
 * @param {'success'|'error'|'warning'} type - Type de notification
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
