# Documentation Technique - Thunderbird RAG Search Extension

## 📚 Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Modules](#modules)
   - [Module d'Indexation](#module-dindexation)
   - [Module de Recherche](#module-de-recherche)
   - [Module de Génération (RAG)](#module-de-génération-rag)
   - [Module UI](#module-ui)
   - [Module de Configuration](#module-de-configuration)
3. [Flux de Données](#flux-de-données)
4. [Stockage des Données](#stockage-des-données)
5. [Embeddings et Recherche Vectorielle](#embeddings-et-recherche-vectorielle)
6. [Configuration](#configuration)
7. [Sécurité](#sécurité)
8. [Performances](#performances)
9. [Tests](#tests)
10. [Dépannage](#dépannage)
11. [Décisions Techniques](#décisions-techniques)

---

## 🏗️ Architecture Générale

L'extension suit une **architecture modulaire** avec séparation claire des responsabilités :

```
┌─────────────────────────────────────────────────────────────────┐
│                        Thunderbird RAG Search                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Indexation │    │   Recherche │    │  Génération │         │
│  │ (IndexedDB) │    │ (Vectorielle)│    │   (RAG)     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│           │                   │                   │                │
│           └───────────────────┼───────────────────┘                │
│                               ▼                                      │
│                    ┌─────────────────┐                            │
│                    │     Vector      │                            │
│                    │    Store       │                            │
│                    │  (IndexedDB)    │                            │
│                    └─────────────────┘                            │
│                                                                  │
│                    ┌─────────────────┐                            │
│                    │      UI         │                            │
│                    │   (Sidebar)     │                            │
│                    └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Technologies Utilisées

| Composant | Technologie | Version | Description |
|-----------|-------------|---------|-------------|
| **Langage** | JavaScript (ES6+) | - | Langage principal de l'extension |
| **API Thunderbird** | WebExtensions | - | API pour interagir avec Thunderbird |
| **Stockage Vectoriel** | IndexedDB | - | Base de données locale pour les embeddings |
| **Requêtes HTTP** | Axios | ^1.6.0 | Appels API (Mistral, Ollama) |
| **Tests** | Jest | ^29.7.0 | Tests unitaires et d'intégration |
| **Gestion de Projet** | Yarn | - | Gestion des dépendances |

---

## 📦 Modules

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

**Fonctionnalités Clés** :

```javascript
// Indexation complète
const result = await indexAllEmails(['folderId1', 'folderId2']);

// Indexation incrémentale
const result = await indexModifiedEmails(['folderId1']);

// Vérification de l'indexation
const isIndexed = await checkEmailIndexed('emailId123');

// Vérification de la configuration des embeddings
const embeddingConfig = await checkEmbeddingConfig();
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

**Responsabilités** :
- Interface utilisateur dans la barre latérale de Thunderbird
- Sélection des dossiers à indexer
- Configuration du RAG (clé API, endpoint, type de LLM)
- Affichage des résultats de recherche
- Affichage des résultats RAG
- Gestion des erreurs et notifications

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
  },
  rag: {
    type: "api_externe",
    api: {
      endpoint: "https://api.mistral.ai/v1",
      apiKey: "",
      embeddingEndpoint: "https://api.mistral.ai/v1/embeddings",
    },
    local: {
      url: "http://localhost:11434",
      model: "mistral-7b",
    },
  },
  selectedFolders: [],
  lastIndexation: null,
}
```

---

## 🔄 Flux de Données

### Flux d'Indexation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Sélection   │────▶│ Récupération │────▶│ Prétraitement│
│ des Dossiers │     │   Emails     │     │   Emails     │
└─────────────┘     └─────────────┘     └─────────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Génération  │◀────│ Indexation   │◀────│ Embeddings   │
│ Embeddings  │     │ Vector Store │     │ (API Mistral)│
└─────────────┘     └─────────────┘     └─────────────┘
```

### Flux de Recherche RAG

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Requête    │────▶│ Prétraitement│────▶│ Recherche   │
│ Utilisateur  │     │   Requête    │     │ Vectorielle │
└─────────────┘     └─────────────┘     └─────────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Construction │◀────│  Résultats  │     │ Génération  │
│   Contexte   │     │  Pertinents │────▶│   RAG       │
└─────────────┘     └─────────────┘     └─────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────┐
                                              │   Réponse   │
                                              │   Finale    │
                                              └─────────────┘
```

---

## 💾 Stockage des Données

### IndexedDB

**Base de données** : `ThunderbirdRAGVectorDB`

**Store** : `emails`

**Structure des données** :

```javascript
{
  id: 'unique-id',           // ID unique généré
  emailId: 'thunderbird-id', // ID Thunderbird de l'email
  subject: 'Sujet',          // Sujet de l'email
  body: 'Corps de l email',  // Corps nettoyé
  from: 'expéditeur',        // Expéditeur
  to: 'destinataire',        // Destinataire
  date: 1234567890,          // Timestamp
  folderName: 'Inbox',       // Nom du dossier
  lastModified: 1234567890,  // Dernière modification
  embedding: [0.1, 0.2, ...], // Vecteur d'embedding (384 dimensions)
  embeddingHash: 'hash',     // Hash pour indexation
  timestamp: 1234567890,     // Timestamp d'indexation
}
```

**Index** :
- `emailId` : Pour la recherche par ID Thunderbird
- `folderName` : Pour le filtrage par dossier
- `date` : Pour le filtrage par date
- `lastModified` : Pour l'indexation incrémentale
- `subject` : Pour la recherche par mots-clés
- `from` : Pour le filtrage par expéditeur
- `to` : Pour le filtrage par destinataire

### browser.storage.local

**Clé** : `ragExtensionConfig`

**Structure** :

```javascript
{
  indexation: {
    excludedFolders: ['Spam'],
    indexAttachments: false,
    maxEmailSize: 10485760,
  },
  rag: {
    type: 'api_externe',
    api: {
      endpoint: 'https://api.mistral.ai/v1',
      apiKey: 'votre-clé-api',
      embeddingEndpoint: 'https://api.mistral.ai/v1/embeddings',
    },
    local: {
      url: 'http://localhost:11434',
      model: 'mistral-7b',
    },
  },
  selectedFolders: ['folder1', 'folder2'],
  lastIndexation: '2024-07-27T10:00:00.000Z',
}
```

---

## 🎯 Embeddings et Recherche Vectorielle

### Génération des Embeddings

L'extension utilise **l'API Mistral Embeddings** pour générer des vecteurs de 384 dimensions pour chaque email.

**Endpoint** : `https://api.mistral.ai/v1/embeddings`

**Modèle** : `mistral-embed-text` (par défaut)

**Payload** :

```json
{
  "model": "mistral-embed-text",
  "input": ["texte à transformer en embedding"]
}
```

**Réponse** :

```json
{
  "data": [
    {
      "embedding": [0.123, 0.456, ..., 0.789],
      "index": 0
    }
  ],
  "model": "mistral-embed-text",
  "usage": {
    "prompt_tokens": 10,
    "total_tokens": 10
  }
}
```

### Similarité Cosinus

La similarité cosinus est utilisée pour mesurer la similarité entre deux vecteurs d'embeddings :

```javascript
function cosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}
```

**Valeurs** :
- `1` : Vecteurs identiques (très similaires)
- `0` : Vecteurs orthogonaux (pas de similarité)
- `-1` : Vecteurs opposés

### Fallback : Recherche par Mots-Clés

Si les embeddings ne sont pas disponibles (pas de clé API configurée), l'extension utilise une recherche par mots-clés :

1. Normalisation de la requête (suppression des stop words, nettoyage)
2. Recherche des emails contenant les mots de la requête
3. Calcul d'un score basé sur le nombre de correspondances

---

## ⚙️ Configuration

### Configuration de l'Indexation

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `excludedFolders` | `string[]` | `['Spam']` | Dossiers exclus de l'indexation |
| `indexAttachments` | `boolean` | `false` | Indexer les pièces jointes |
| `maxEmailSize` | `number` | `10485760` | Taille maximale des emails (10 Mo) |

### Configuration du RAG

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `type` | `'api_externe' \| 'local'` | `'api_externe'` | Type de LLM à utiliser |
| `api.endpoint` | `string` | `'https://api.mistral.ai/v1'` | Endpoint API Mistral |
| `api.apiKey` | `string` | `''` | Clé API Mistral |
| `api.embeddingEndpoint` | `string` | `'https://api.mistral.ai/v1/embeddings'` | Endpoint pour les embeddings |
| `local.url` | `string` | `'http://localhost:11434'` | URL du serveur Ollama |
| `local.model` | `string` | `'mistral-7b'` | Modèle Ollama à utiliser |

### Configuration Globale

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `selectedFolders` | `string[]` | `[]` | Dossiers sélectionnés pour l'indexation |
| `lastIndexation` | `string \| null` | `null` | Date de la dernière indexation |

---

## 🔒 Sécurité

### Confidentialité

- **Aucun chiffrement** : Les données sont stockées en clair dans IndexedDB
- **Stockage local** : Toutes les données restent sur la machine de l'utilisateur
- **Consentement explicite** : L'utilisateur doit explicitement sélectionner les dossiers à indexer

### Journalisation

- **Logs en texte brut** : Tous les logs sont stockés en texte brut
- **Stockage** : `browser.storage.local` (limité à 1000 logs)
- **Export** : Possibilité d'exporter les logs vers un fichier

**Niveaux de log** :
- `INFO` : Informations générales
- `WARN` : Avertissements
- `ERROR` : Erreurs

### Gestion des Clés API

- **Stockage** : Les clés API sont stockées dans `browser.storage.local`
- **Sécurité** : Les clés ne sont jamais envoyées à des tiers sans le consentement de l'utilisateur
- **Configuration** : L'utilisateur doit explicitement configurer sa clé API

### Permissions Thunderbird

L'extension nécessite les permissions suivantes :

```json
{
  "permissions": [
    "accountsRead",
    "messagesRead",
    "messagesModify",
    "storage",
    "notifications",
    "downloads"
  ]
}
```

---

## ⚡ Performances

### Temps d'Indexation

| Nombre d'emails | Temps estimé (machine standard) |
|-----------------|----------------------------------|
| 100 | < 1 minute |
| 1 000 | 5-10 minutes |
| 10 000 | 30-60 minutes |

**Facteurs influençant les performances** :
- Taille des emails
- Vitesse de l'API Mistral (pour les embeddings)
- Performances de IndexedDB
- Ressources machine disponibles

### Temps de Réponse RAG

| Étape | Temps estimé |
|-------|--------------|
| Recherche vectorielle | 100-500ms |
| Génération (API Mistral) | 1-3 secondes |
| Génération (Ollama local) | 2-5 secondes |
| **Total** | **2-8 secondes** |

**Optimisations** :
- Cache des embeddings déjà générés
- Indexation incrémentale
- Limitation du nombre de résultats (par défaut : 3 pour le RAG)

### Benchmarks

Les tests de performance peuvent être exécutés avec :

```bash
yarn test tests/performance/
```

---

## 🧪 Tests

### Tests Unitaires

**Fichiers** : `tests/unit/*.test.js`

**Couverture** :
- `helpers.js` : 100%
- `defaultConfig.js` : 100%
- `queryProcessor.js` : 100%
- `embeddingService.js` : 100%
- `apiClient.js` : 100%
- `ollamaClient.js` : 100%

**Exécution** :

```bash
# Tous les tests
yarn test

# Tests avec couverture
yarn test:coverage

# Tests en mode surveillance
yarn test:watch
```

### Tests d'Intégration

**Fichiers** : `tests/integration/*.test.js`

**Scénarios testés** :
- Flux complet d'indexation
- Flux complet RAG
- Interaction entre modules

### Tests de Performance

**Fichiers** : `tests/performance/*.test.js`

**Scénarios testés** :
- Indexation de nombreux emails
- Recherche rapide
- Indexation incrémentale

---

## 🛠️ Dépannage

### Problèmes Courants

#### 1. Les emails ne sont pas indexés

**Causes possibles** :
- Aucun dossier sélectionné
- Dossiers exclus (ex: Spam)
- Emails trop grands (dépassent `maxEmailSize`)
- Problème de connexion à l'API Mistral

**Solutions** :
- Vérifier la configuration : `selectedFolders`
- Vérifier les dossiers exclus : `excludedFolders`
- Vérifier la taille maximale : `maxEmailSize`
- Vérifier la configuration des embeddings

#### 2. La recherche ne retourne aucun résultat

**Causes possibles** :
- Aucun email indexé
- Requête trop courte (< 2 caractères)
- Problème avec les embeddings

**Solutions** :
- Vérifier que l'indexation a été exécutée
- Vérifier la configuration des embeddings
- Essayer une requête plus longue

#### 3. Erreur API Mistral

**Causes possibles** :
- Clé API invalide
- Endpoint incorrect
- Problème de connexion internet
- Quota dépassé

**Solutions** :
- Vérifier la clé API dans la configuration
- Vérifier l'endpoint
- Vérifier la connexion internet
- Vérifier le quota sur le tableau de bord Mistral

#### 4. Ollama ne répond pas

**Causes possibles** :
- Ollama n'est pas installé
- Ollama n'est pas en cours d'exécution
- URL incorrecte
- Modèle non téléchargé

**Solutions** :
- Installer Ollama : `curl -fsSL https://ollama.ai/install.sh | sh`
- Démarrer Ollama : `ollama serve`
- Vérifier l'URL : `http://localhost:11434`
- Télécharger le modèle : `ollama pull mistral-7b`

### Journalisation

Pour diagnostiquer les problèmes, activez les logs et exportez-les :

```javascript
// Dans la console de l'extension
browser.runtime.sendMessage({ type: 'EXPORT_LOGS' });
```

Ou via l'interface utilisateur :
1. Ouvrir la barre latérale de l'extension
2. Aller dans l'onglet "Logs"
3. Cliquer sur "Exporter les logs"

---

## 📋 Décisions Techniques

### 1. Pourquoi IndexedDB au lieu de ChromaDB ?

**Raison** : ChromaDB nécessite Python et un serveur séparé, ce qui n'est pas compatible avec les extensions Thunderbird.

**Avantages d'IndexedDB** :
- ✅ Intégré au navigateur (pas de dépendance externe)
- ✅ Compatible avec les WebExtensions
- ✅ Persistant entre les sessions
- ✅ Performant pour les opérations de lecture/écriture
- ✅ Pas besoin de serveur séparé

**Inconvénients** :
- ❌ Pas de recherche vectorielle native (nécessite une implémentation manuelle)
- ❌ Limite de stockage (selon le navigateur)

### 2. Pourquoi l'API Mistral pour les Embeddings ?

**Raisons** :
- ✅ Solution simple et efficace
- ✅ Pas besoin de modèle local (économise des ressources)
- ✅ Modèles optimisés pour le français et l'anglais
- ✅ API bien documentée

**Alternatives envisagées** :
- **ONNX Runtime** : Modèles locaux, mais plus complexe à intégrer
- **TensorFlow.js** : Modèles locaux, mais taille importante
- **TF-IDF/BM25** : Solution légère, mais moins précise

### 3. Pourquoi Axios au lieu de Fetch ?

**Raisons** :
- ✅ Meilleure gestion des erreurs
- ✅ Support des timeouts
- ✅ Interception des requêtes
- ✅ Compatible avec les navigateurs modernes

### 4. Architecture Modulaire

**Avantages** :
- ✅ Séparation claire des responsabilités
- ✅ Facilité de maintenance
- ✅ Testabilité accrue
- ✅ Extensibilité

**Modules** :
- Indexation (récupération + stockage)
- Recherche (vectorielle + mots-clés)
- Génération (RAG + API)
- UI (interface utilisateur)
- Configuration (stockage + gestion)

---

## 📖 Documentation Complémentaire

- [Documentation Utilisateur](user_guide.md) - Guide d'installation et d'utilisation
- [Guide de Contribution](contributing.md) - Comment contribuer au projet
- [Changelog](CHANGELOG.md) - Historique des modifications
