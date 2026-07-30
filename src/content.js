/**
 * Script de contenu pour l'extension Thunderbird RAG Search
 * S'exécute dans le contexte des pages Thunderbird
 * @module content
 */

import { logInfo, logError } from './utils/logger.js';

/**
 * Initialise le script de contenu
 */
function initContentScript() {
  try {
    logInfo('Script de contenu initialisé');
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Injecter des styles ou éléments si nécessaire
    injectStyles();
    
  } catch (error) {
    logError(error, 'Initialisation du script de contenu');
  }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
  // Écouter les clics sur les emails pour des actions spécifiques
  document.addEventListener('click', (e) => {
    handleClick(e);
  });

  // Écouter les appuis sur les touches
  document.addEventListener('keydown', (e) => {
    handleKeyDown(e);
  });
}

/**
 * Gère les clics
 * @param {Event} e - Événement de clic
 */
function handleClick(e) {
  try {
    // Exemple : Détecter les clics sur les emails
    const emailElement = e.target.closest('.message-row, [data-message-id]');
    if (emailElement) {
      const messageId = emailElement.getAttribute('data-message-id') || 
                       emailElement.dataset.messageId;
      
      if (messageId) {
        logInfo(`Clic sur l'email : ${messageId}`);
        
        // Envoyer un message au script de fond si nécessaire
        browser.runtime.sendMessage({
          type: 'EMAIL_CLICKED',
          messageId,
        }).catch(error => {
          logError(error, 'Envoi du message EMAIL_CLICKED');
        });
      }
    }
  } catch (error) {
    logError(error, 'Gestion du clic');
  }
}

/**
 * Gère les appuis sur les touches
 * @param {Event} e - Événement de touche
 */
function handleKeyDown(e) {
  try {
    // Exemple : Détecter les raccourcis clavier
    if (e.ctrlKey && e.key === 'f') {
      // Ctrl+F : Focus sur la recherche
      e.preventDefault();
      logInfo('Raccourci Ctrl+F détecté');
      
      browser.runtime.sendMessage({
        type: 'FOCUS_SEARCH',
      }).catch(error => {
        logError(error, 'Envoi du message FOCUS_SEARCH');
      });
    }
  } catch (error) {
    logError(error, 'Gestion de la touche');
  }
}

/**
 * Injecte des styles personnalisés
 */
function injectStyles() {
  try {
    // Créer un élément style
    const styleElement = document.createElement('style');
    styleElement.id = 'rag-search-styles';
    
    // Ajouter des styles pour les éléments de l'extension
    styleElement.textContent = `
      /* Styles pour les éléments injectés par l'extension RAG Search */
      .rag-search-highlight {
        background-color: #ffeb3b !important;
        padding: 2px 4px;
        border-radius: 2px;
      }
      
      .rag-search-selected {
        border: 2px solid #0066cc !important;
        background-color: rgba(0, 102, 204, 0.1) !important;
      }
    `;
    
    // Ajouter l'élément au head
    document.head.appendChild(styleElement);
    logInfo('Styles injectés avec succès');
    
  } catch (error) {
    logError(error, 'Injection des styles');
  }
}

/**
 * Surligne les résultats de recherche dans la page
 * @param {string[]} terms - Liste des termes à surligner
 */
function highlightSearchTerms(terms) {
  try {
    if (!terms || terms.length === 0) {
      removeHighlights();
      return;
    }
    
    // Supprimer les surlignages existants
    removeHighlights();
    
    // Créer une expression régulière pour tous les termes
    const regex = new RegExp(terms.map(term => escapeRegExp(term)).join('|'), 'gi');
    
    // Surligner les termes dans le corps de la page
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeValue && regex.test(node.nodeValue)) {
        const span = document.createElement('span');
        span.className = 'rag-search-highlight';
        span.innerHTML = node.nodeValue.replace(regex, match => `<span class="rag-search-highlight">${match}</span>`);
        node.parentNode.replaceChild(span, node);
      }
    }
    
    logInfo(`Surlignage des termes : ${terms.join(', ')}`);
    
  } catch (error) {
    logError(error, 'Surlignage des termes de recherche');
  }
}

/**
 * Supprime les surlignages
 */
function removeHighlights() {
  try {
    const highlights = document.querySelectorAll('.rag-search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });
    
    logInfo('Surlignages supprimés');
    
  } catch (error) {
    logError(error, 'Suppression des surlignages');
  }
}

/**
 * Échappe les caractères spéciaux pour les expressions régulières
 * @param {string} string - Chaîne à échapper
 * @returns {string} Chaîne échappée
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Initialiser le script de contenu
initContentScript();

// Exporter les fonctions pour qu'elles soient accessibles depuis d'autres modules
if (typeof window !== 'undefined') {
  window.ragSearchHighlight = highlightSearchTerms;
  window.ragSearchRemoveHighlights = removeHighlights;
}
