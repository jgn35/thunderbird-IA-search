# Documentation Technique - Thunderbird RAG Search Extension

## 📌 Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Communication Inter-Modules](#communication-inter-modules)
3. [Modules](#modules)
   - [Script Background](#script-background)
   - [Module d'Indexation](#module-dindexation)
   - [Module de Recherche](#module-de-recherche)
   - [Module de Génération (RAG)](#module-de-génération-rag)
   - [Module UI](#module-ui)
   - [Module de Configuration](#module-de-configuration)
4. [Flux de Données](#flux-de-données)
5. [Stockage des Données](#stockage-des-données)
6. [Embeddings et Recherche Vectorielle](#embeddings-et-recherche-vectorielle)
7. [Configuration](#configuration)
8. [Sécurité](#sécurité)
9. [Performances](#performances)
10. [Tests](#tests)
11. [Dépannage](#dépannage)
12. [Décisions Techniques](#décisions-techniques)

---

## 🏗️ Architecture Générale

L'extension suit une **architecture modulaire** avec séparation claire des responsabilités. Depuis la refactorisation, **toute la logique d'indexation est centralisée dans le script background**, tandis que les interfaces utilisateur (sidebar et options) communiquent uniquement via des messages.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Thunderbird RAG Search                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Indexation │    │   Recherche │    │  Génération │         │
│  │ (IndexedDB) │    │ (Vectorielle)│    │   (RAG)     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│           │                   │                   │                │
│           └───────────────────┼───────────────────┘                │
│                               ▼                                      │
│                    ┌─────────────────────┐                            │
│                    │     Vector Store    │                            │
│                    │   (IndexedDB)        │                            │
│                    └─────────────────────┘                            │
│                                                                  │
│                    ┌─────────────────────┐                            │
│                    │       Background    │◄───────────────────────┐
│                    │      Script         │         │               │
│                    │  (Gère tout l'index) │         │               │
│                    └─────────────────────┘         │               │
│                               ▲                          │               │
│                               │                          │               │
│                    ┌─────────────────────┐         │               │
│                    │         UI         │         │               │
│                    │   (Sidebar/Options)  │         │               │
│                    │  (Messages uniquement)│         │               │
│                    └─────────────────────┘         │               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technologies Utilisées

| Composant | Technologie | Version | Description |
|-----------|-------------|---------|-------------|
| **Langage** | JavaScript (ES6+) | - | Langage principal de l'extension |
| **API Thunderbird** | WebExtensions | - | API pour interagir avec Thunderbird |
| **Stockage Vectoriel** | IndexedDB | - | Base de données locale pour les embeddings |
| **Requêtes HTTP** | Fetch API (Native) | Appels API (Mistral, Ollama) |
| **Tests** | Jest | ^29.7.0 | Tests unitaires et d'intégration |
| **Gestion de Projet** | Yarn | - | Gestion des dépendances |

---

## 📡 Communication Inter-Modules

### Principe Fondamental

**Toute la logique d'indexation est centralisée dans `background.js`**. Les interfaces utilisateur (sidebar et options) **n'appellent plus directement les fonctions d'indexation**, mais envoient des messages au script background via `browser.runtime.sendMessage()`.

### Types de Messages

#### Messages d'Indexation

| Type | Description | Paramètres | Réponse |
|------|-------------|-----------|---------|
| `INDEX_ALL_EMAILS` | Indexe tous les emails des dossiers sélectionnés | `selectedFolderIds`, `config` | Statistiques d'indexation |
| `INDEX_MODIFIED_EMAILS` | Indexe uniquement les emails modifiés | `selectedFolderIds`, `config` | Statistiques d'indexation |
| `CLEAR_INDEX` | Supprime tous les emails indexés | - | Résultat de la suppression |
| `INDEX_EMAIL` | Indexe un email spécifique | `emailData` | Booléen de succès |
| `UNINDEX_EMAIL` | Supprime un email de l'index | `emailId`, `lastModified` | Booléen de succès |
| `GET_INDEX_STATS` | Récupère les statistiques de l'index | - | Statistiques |
| `GET_INDEXATION_STATE` | Récupère l'état actuel de l'indexation | - | État |
| `CHECK_EMAIL_INDEXED` | Vérifie si un email est indexé | `emailId`, `lastModified` | Booléen |
| `CHECK_EMBEDDING_CONFIG` | Vérifie la configuration des embeddings | - | Configuration |

#### Messages Messenger (Thunderbird API)

| Type | Description | Paramètres | Réponse |
|------|-------------|-----------|---------|
| `MESSENGER_GET_ACCOUNTS` | Récupère la liste des comptes | - | Liste des comptes |
| `MESSENGER_GET_FOLDERS` | Récupère les dossiers d'un compte | `accountId` | Liste des dossiers |
| `MESSENGER_GET_EMAILS` | Récupère les emails d'un dossier | `folderId`, `options` | Liste des emails |
| `MESSENGER_GET_FULL_EMAIL` | Récupère le contenu complet d'un email | `messageId` | Email complet |
| `MESSENGER_EMAIL_EXISTS` | Vérifie si un email existe | `messageId` | Booléen |

#### Messages de Configuration

| Type | Description | Paramètres | Réponse |
|------|-------------|-----------|---------|
| `GET_CONFIG` | Récupère la configuration actuelle | - | Configuration |
| `GET_ACCOUNTS_AND_FOLDERS` | Récupère comptes et dossiers | - | Comptes et dossiers |

### Exemple de Communication

**Depuis l'UI (sidebar.js ou options.js) :**
```javascript
// Démarrer une indexation complète
const result = await browser.runtime.sendMessage({
  type: 'INDEX_ALL_EMAILS',
  selectedFolderIds: ['folder1', 'folder2'],
  config: appState.config
});

if (result.success) {
  console.log(`Indexation terminée: ${result.indexed} emails indexés`);
}
```

**Dans background.js :**
```javascript
// Gestion du message
case 'INDEX_ALL_EMAILS':
  const result = await indexAllEmails(message.selectedFolderIds, message.config);
  sendResponse({ success: result.success, ...result });
  break;
```

### Avantages de cette Architecture

1. **Centralisation** : Toute la logique métier est dans un seul endroit (background.js)
2. **Sécurité** : Le background script a accès à toutes les API Thunderbird
3. **Maintenabilité** : Plus facile à déboguer et à faire évoluer
4. **Isolation** : Les UI ne dépendent plus des modules d'indexation
5. **Testabilité** : Les fonctions d'indexation peuvent être testées indépendamment

---

## 📦 Modules

### Script Background

**Fichier** : `src/background.js`

**Responsabilités** :
- Point central de toute la logique d'indexation
- Gestion des messages entre les différents modules
- Écoute des événements Thunderbird (nouveaux emails, suppressions, etc.)
- Vérifications périodiques des emails modifiés
- Coordination entre les modules d'indexation, de recherche et de génération

**Fonctionnalités Clés** :

```javascript
// Initialisation
initBackground();

// Gestion des messages
browser.runtime.onMessage.addListener(handleMessage);

// Écoute des événements Thunderbird
messenger.messages.onNewMailReceived.addListener(handleMessageCreated);
messenger.messages.onDeleted.addListener(handleMessagesDeleted);
```

---

### Module d'Indexation

**Fichiers** :
- `src/modules/indexation/emailFetcher.js` - Récupération des emails depuis Thunderbird
- `src/modules/indexation/vectorStore.js` - Gestion du stockage vectoriel (IndexedDB)
- `src/modules/indexation/embeddingService.js` - Génération des embeddings via API Mistral
- `src/modules/indexation/indexer.js` - Logique principale d'indexation
- `src/modules/indexation/chromaManager.js` - Wrapper déprécié (compatibilité)

**Responsabilités** :
- Récupération des emails depuis les dossiers Thunderbird sélectionnés
- Filtrage des dossiers exclus (ex: Spam)
- Indexation incrémentale des emails
- Génération des embeddings pour chaque email
- Stockage des embeddings et métadonnées dans IndexedDB
- Réindexation automatique des emails modifiés
- Suppression des données lors de la suppression d'emails

**⚠️ Important** : Ce module **n'est plus appelé directement depuis l'UI**. Toutes les fonctions sont maintenant appelées **uniquement depuis background.js** via les messages.

**Fonctionnalités Clés** :

```javascript
// Ces fonctions sont appelées UNIQUEMENT depuis background.js

// Indexation complète
export async function indexAllEmails(selectedFolderIds, config = null) { ... }

// Indexation incrémentale
export async function indexModifiedEmails(selectedFolderIds, config = null) { ... }

// Vérification de l'indexation
export async function checkEmailIndexed(emailId, lastModified = null) { ... }

// Vérification de la configuration des embeddings
export async function checkEmbeddingConfig() { ... }
```

**Stockage des Données** :
- **Embeddings** : IndexedDB (collection `emails`)
- **Métadonnées** : Stockées avec les embeddings dans IndexedDB
- **Configuration** : `browser.storage.local` (Thunderbird)

---

### Module de Recherche

**Fichiers** :
- `src/modules/recherche/queryProcessor.js` - Prétraitement des requêtes
- `src/modules/recherche/searchEngine.js` - Moteur de recherche vectorielle

**Responsabilités** :
- Prétraitement des requêtes (détection de langue, suppression des stop words)
- Recherche vectorielle utilisant la similarité cosinus
- Recherche par mots-clés (fallback)
- Filtrage des résultats par dossier, date, expéditeur, destinataire
- Suggestions de recherche

**Fonctionnalités Clés** :

```javascript
// Recherche simple
const result = await search('ma requête', { limit: 5 });

// Recherche avancée
const result = await advancedSearch({
  query: 'ma requête',
  folders: ['Inbox'],
  fromDate: new Date('2024-01-01'),
  toDate: new Date('2024-12-31'),
});

// Recherche sémantique pour RAG
const result = await semanticSearchForRAG('ma question', 3);

// Suggestions de recherche
const suggestions = await getSearchSuggestions('rech');
```

**Algorithmes** :
- **Similarité Cosinus** : Mesure la similarité entre les vecteurs d'embeddings
- **TF-IDF simplifié** : Utilisé comme fallback si les embeddings ne sont pas disponibles
- **Détection de Langue** : Basée sur les stop words (français et anglais)

---

### Module de Génération (RAG)

**Fichiers** :
- `src/modules/generation/apiClient.js` - Client API Mistral
- `src/modules/generation/ollamaClient.js` - Client Ollama
- `src/modules/generation/ragOrchestrator.js` - Orchestration RAG

**Responsabilités** :
- Orchestration du pipeline RAG (Retrieval + Generation)
- Appel à l'API Mistral pour la génération
- Appel à Ollama pour la génération locale
- Construction des prompts pour le RAG
- Gestion des erreurs API
- Résumé de conversations

**Fonctionnalités Clés** :

```javascript
// Effectuer une recherche RAG
const result = await performRAG('Quelle est l'heure de la réunion ?', {
  contextLimit: 3,
  llmType: 'api_externe', // ou 'local'
});

// Résumer une conversation
const result = await summarizeConversation(['emailId1', 'emailId2']);

// Vérifier la configuration RAG
const config = await checkRAGConfig();

// Changer le type de LLM
const result = await setLLMType('local');
```

**Modèles Supportés** :
- **Mistral AI** : `mistral-tiny`, `mistral-small`, `mistral-medium`, etc.
- **Ollama** : `mistral-7b`, `llama2`, `phi3`, etc.

---

### Module UI

**Fichiers** :
- `src/modules/ui/sidebar.js` - Logique principale de l'interface
- `src/modules/ui/sidebar.html` - Structure HTML
- `src/modules/ui/sidebar.css` - Styles CSS
- `src/modules/ui/options.js` - Page des options
- `src/modules/ui/options.html` - Structure HTML des options

**Responsabilités** :
- Interface utilisateur dans la barre latérale de Thunderbird
- Sélection des dossiers à indexer
- Configuration du RAG (clé API, endpoint, type de LLM)
- Affichage des résultats de recherche
- Affichage des résultats RAG
- Gestion des erreurs et notifications

**⚠️ Changement Architectural** : 
- **Avant** : Appel direct aux fonctions d'indexation (`indexAllEmails()`, etc.)
- **Maintenant** : Envoi de messages au background script via `browser.runtime.sendMessage()`

**Fonctionnalités Clés** :
- Onglets pour différentes fonctionnalités
- Configuration en temps réel
- Historique des recherches
- Notifications

---

### Module de Configuration

**Fichiers** :
- `src/config/defaultConfig.js` - Configuration par défaut
- `src/config/storageManager.js` - Gestion du stockage

**Responsabilités** :
- Gestion de la configuration utilisateur
- Stockage persistant des paramètres
- Gestion des logs
- Export des logs

**Configuration par Défaut** :

```javascript
{
  indexation: {
    excludedFolders: ["Spam"],
    indexAttachments: false,
    maxEmailSize: 10485760, // 10 Mo
    chunkSize: 512,
    chunkOverlap: 100,
  },
  rag: {
    type: "api_externe",
    api: {
      endpoint: "https://api.mistral.ai/v1",
      apiKey: "",
      embeddingEndpoint: "https://api.mistral.ai/v1/embeddings",
      model: "mistral-tiny",
    },
    local: {
      url: "http://localhost:11434",
      model: "mistral-7b",
    },
    topK: 5,
    temperature: 0.7,
  },
  selectedFolders: [],
  lastIndexation: null,
  debug: {
    enableDebugLogs: false,
  },
}
```

---

## 🔄 Flux de Données

### Flux d'Indexation (Nouvelle Architecture)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI (Sidebar    │     │   UI (Options)   │     │                 │
│    ou Options)   │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     │                 │
         │                     │                   │                 │
         │ Envoyer Message      │ Envoyer Message    │                 │
         ▼                     ▼                   │                 │
┌─────────────────────────────────────────────────────────────┐ │
│                    background.js                              │ │
│  ┌─────────────────────────────────────────────────────────┐│ │
│  │ 1. Reçoit le message (INDEX_ALL_EMAILS, etc.)            ││ │
│  │ 2. Vérifie la configuration                              ││ │
│  │ 3. Appelle les fonctions d'indexation                    ││ │
│  │ 4. Gère les événements Thunderbird                       ││ │
│  │ 5. Retourne le résultat à l'UI                          ││ │
│  └─────────────────────────────────────────────────────────┘│ │
└─────────────────────────────────────────────────────────────┘ │
         │                     │                           │
         ▼                     ▼                           ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ emailFetcher.js  │ │ vectorStore.js   │ │ embeddingService│
│ (Récupération)   │ │ (Stockage)       │ │ .js (Embeddings) │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                     │                   │
         └─────────────────────┼───────────────────┘
                               ▼
                    ┌─────────────────┐
                    │   IndexedDB     │
                    │ (Stockage local)│
                    └─────────────────┘
```

### Flux de Recherche RAG

```
┌─────────────────┐
│   UI (Sidebar)   │
└────────┬────────┘
         │
         │ Requête Utilisateur
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    background.js                              │
│  (Peut être contourné pour la recherche directe)              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ queryProcessor.js│     │ searchEngine.js │     │ ragOrchestrator.js│
│ (Prétraitement)  │────▶│ (Recherche)     │────▶│ (Génération)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                     │                   │
         │                     ▼                   ▼
         │           ┌─────────────────────────────────┐
         │           │       Vector Store (IndexedDB)   │
         │           │       + Embeddings              │
         │           └─────────────────────────────────┘
         │                             │
         │                             ▼
         │           ┌─────────────────────────────────┐
         └───────────│         Résultats                │
                     │       + Réponse RAG              │
                     └─────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │   UI (Sidebar)   │
                    │ (Affichage)      │
                    └─────────────────┘
```

### Flux d'Événements Thunderbird

```
┌─────────────────────────────────────────────────────────────┐
│                    Thunderbird Events                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ onNewMail       │  │ onUpdated       │  │ onDeleted       │  │
│  │ Received        │  │                 │  │                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼──────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    background.js                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ handleMessage   │  │ handleMessage   │  │ handleMessages  │  │
│  │ Created         │  │ Modified        │  │ Deleted         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                  │                   │            │
│           ▼                  ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Vérifie si le dossier est sélectionné pour l'indexation   ││
│  │ Si oui : Récupère l'email et appelle indexEmail()         ││
│  │ Si non : Ignore l'événement                                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 Stockage des Données

### IndexedDB

**Base de données** : `ThunderbirdRAGVectorDB`

**Store** : `emails`

