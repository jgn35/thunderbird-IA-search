# Guide de Contribution - Thunderbird RAG Search Extension

## 📖 Table des Matières

1. [Introduction](#introduction)
2. [Prérequis](#prérequis)
3. [Installation du Projet](#installation-du-projet)
4. [Structure du Projet](#structure-du-projet)
5. [Conventions de Code](#conventions-de-code)
6. [Processus de Développement](#processus-de-développement)
7. [Tests](#tests)
8. [Documentation](#documentation)
9. [Soumission des Modifications](#soumission-des-modifications)
10. [Revue de Code](#revue-de-code)
11. [Ajouter de Nouvelles Fonctionnalités](#ajouter-de-nouvelles-fonctionnalités)
12. [Ajouter le Support d'un Nouveau LLM](#ajouter-le-support-dun-nouveau-llm)
13. [Ajouter le Support d'une Nouvelle Langue](#ajouter-le-support-dune-nouvelle-langue)

---

## 🎯 Introduction

Merci de votre intérêt pour contribuer à **Thunderbird RAG Search Extension** ! 

Ce projet est open source et nous accueillons les contributions de la communauté. Que vous soyez un développeur, un testeur, un rédacteur technique ou simplement un utilisateur passionné, il y a de nombreuses façons de contribuer.

---

## 📋 Prérequis

### Connaissances Requises

- **JavaScript (ES6+)** : Le projet est écrit en JavaScript moderne
- **WebExtensions API** : API spécifique aux extensions Thunderbird/Firefox
- **IndexedDB** : Pour le stockage local
- **Git** : Pour le contrôle de version
- **Yarn** : Pour la gestion des dépendances

### Outils Requis

- **Node.js** : Version 18 ou supérieure
- **Yarn** : Gestionnaire de paquets
- **Thunderbird** : Version 102.0 ou supérieure (pour les tests)
- **Git** : Pour le contrôle de version

---

## 🚀 Installation du Projet

### 1. Cloner le dépôt

```bash
git clone https://github.com/jgn35/thunderbird-IA-search.git
cd thunderbird-IA-search
```

### 2. Installer les dépendances

```bash
# Avec Yarn (recommandé)
yarn install

# Ou avec npm
npm install
```

### 3. Charger l'extension dans Thunderbird

1. Ouvrir Thunderbird
2. Aller dans `Menu ▶ Add-ons et thèmes ▶ Outils pour les développeurs`
3. Cliquer sur `Charger un module complémentaire temporaire`
4. Sélectionner le fichier `manifest.json` dans le dossier du projet

### 4. Vérifier l'installation

- L'icône de l'extension devrait apparaître dans la barre d'outils
- Cliquez sur l'icône pour ouvrir la barre latérale
- Vérifiez que l'extension fonctionne correctement

---

## 📁 Structure du Projet

```
thunderbird-rag-extension/
├── src/
│   ├── modules/
│   │   ├── indexation/           # Module d'indexation
│   │   │   ├── emailFetcher.js   # Récupération des emails
│   │   │   ├── vectorStore.js    # Stockage vectoriel (IndexedDB)
│   │   │   ├── embeddingService.js # Génération des embeddings
│   │   │   ├── indexer.js        # Logique d'indexation
│   │   │   └── chromaManager.js  # Wrapper déprécié
│   │   ├── recherche/            # Module de recherche
│   │   │   ├── queryProcessor.js # Prétraitement des requêtes
│   │   │   └── searchEngine.js   # Moteur de recherche
│   │   ├── generation/           # Module de génération (RAG)
│   │   │   ├── apiClient.js      # Client API Mistral
│   │   │   ├── ollamaClient.js   # Client Ollama
│   │   │   └── ragOrchestrator.js # Orchestration RAG
│   │   └── ui/                   # Interface utilisateur
│   │       ├── sidebar.js        # Logique de la barre latérale
│   │       ├── sidebar.html      # Structure HTML
│   │       └── sidebar.css       # Styles CSS
│   ├── config/                   # Configuration
│   │   ├── defaultConfig.js      # Configuration par défaut
│   │   └── storageManager.js     # Gestion du stockage
│   ├── utils/                    # Utilitaires
│   │   ├── helpers.js            # Fonctions utilitaires
│   │   └── logger.js             # Journalisation
│   ├── background.js             # Script de fond
│   └── content.js                # Script de contenu
├── tests/
│   ├── unit/                     # Tests unitaires
│   │   ├── indexation.test.js    # Tests du module d'indexation
│   │   ├── recherche.test.js     # Tests du module de recherche
│   │   ├── generation.test.js    # Tests du module de génération
│   │   ├── embeddingService.test.js # Tests des embeddings
│   │   └── vectorStore.test.js   # Tests du vector store
│   ├── integration/              # Tests d'intégration
│   │   ├── indexationFlow.test.js # Tests du flux d'indexation
│   │   └── ragFlow.test.js       # Tests du flux RAG
│   └── performance/              # Tests de performance
│       └── indexationPerformance.test.js
├── docs/
│   ├── technical.md              # Documentation technique
│   ├── user_guide.md             # Guide utilisateur
│   └── contributing.md           # Ce fichier
├── .github/
│   └── workflows/
│       └── tests.yml             # Configuration GitHub Actions
├── package.json                  # Dépendances et scripts
├── manifest.json                # Configuration de l'extension
├── jest.config.js               # Configuration Jest
├── babel.config.js              # Configuration Babel
└── README.md                    # Documentation principale
```

---

## 📝 Conventions de Code

### Style de Code

- **Indentation** : 2 espaces (pas de tabulations)
- **Noms de fichiers** : `camelCase.js` ou `kebab-case.js`
- **Noms de variables** : `camelCase`
- **Noms de fonctions** : `camelCase`
- **Noms de classes** : `PascalCase`
- **Constantes** : `UPPER_SNAKE_CASE`
- **Commentaires** : Utiliser JSDoc pour les fonctions et modules

### Exemple de Code

```javascript
/**
 * Module pour la gestion des embeddings
 * @module modules/indexation/embeddingService
 */

// Utilisation de fetch API native
import { logInfo, logError } from '../../utils/logger.js';

/**
 * Dimension des embeddings Mistral
 * @type {number}
 */
const EMBEDDING_DIMENSION = 384;

/**
 * Génère des embeddings pour un texte
 * @param {string} text - Texte à transformer
 * @returns {Promise<Object>} Résultat avec les embeddings
 */
export async function generateEmbeddings(text) {
  try {
    // Code ici
    return { success: true, embeddings: [] };
  } catch (error) {
    await logError(error, 'Génération des embeddings');
    return { success: false, error: error.message };
  }
}
```

### Bonnes Pratiques

1. **Gestion des erreurs** : Toujours gérer les erreurs et les logger
2. **Documentation** : Documenter toutes les fonctions exportées avec JSDoc
3. **Tests** : Écrire des tests pour toutes les fonctions
4. **Modularité** : Garder les modules petits et focalisés
5. **Noms descriptifs** : Utiliser des noms de variables et fonctions descriptifs
6. **Immutabilité** : Préférer `const` à `let` quand c'est possible
7. **Promesses** : Toujours retourner des promesses pour les opérations asynchrones

---

## 🔄 Processus de Développement

### 1. Créer une Branche

```bash
# Créer une nouvelle branche pour votre fonctionnalité
git checkout -b feature/ma-nouvelle-fonctionnalite

# Ou pour un bug
git checkout -b fix/correction-du-bug
```

### 2. Développer la Fonctionnalité

- Suivre les conventions de code
- Écrire des tests
- Documenter le code
- Mettre à jour la documentation

### 3. Exécuter les Tests

```bash
# Tests unitaires
yarn test

# Tests avec couverture
yarn test:coverage

# Tests en mode surveillance
yarn test:watch
```

### 4. Vérifier la Qualité du Code

```bash
# Linting (à venir)
yarn lint
```

### 5. Commiter les Modifications

```bash
# Ajouter les fichiers modifiés
git add .

# Commiter avec un message clair
git commit -m "feat: Ajout de la nouvelle fonctionnalité"

# Pousser vers la branche
git push origin feature/ma-nouvelle-fonctionnalite
```

### 6. Créer une Pull Request

1. Allez sur [GitHub](https://github.com/jgn35/thunderbird-IA-search)
2. Cliquez sur `Pull requests` puis `New pull request`
3. Sélectionnez votre branche
4. Remplissez le titre et la description
5. Cliquez sur `Create pull request`

---

## 🧪 Tests

### Exécution des Tests

```bash
# Tous les tests
yarn test

# Tests unitaires uniquement
yarn test tests/unit/

# Tests d'intégration
yarn test tests/integration/

# Tests de performance
yarn test tests/performance/

# Tests avec couverture
yarn test:coverage

# Tests en mode surveillance
yarn test:watch
```

### Écrire des Tests

#### Tests Unitaires

- Tester des fonctions individuelles
- Utiliser des mocks pour les dépendances externes
- Couvrir tous les cas (succès, échec, edge cases)

**Exemple** :

```javascript
import { cleanText } from '../../src/utils/helpers.js';

describe('cleanText', () => {
  test('should remove HTML tags', () => {
    const htmlText = '<p>Hello <b>world</b></p>';
    const cleaned = cleanText(htmlText);
    expect(cleaned).toBe('Hello world');
  });

  test('should handle null/undefined', () => {
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
  });
});
```

#### Tests d'Intégration

- Tester l'interaction entre plusieurs modules
- Tester les flux complets (indexation → recherche → RAG)
- Utiliser des mocks pour les dépendances externes (API, IndexedDB)

#### Tests de Performance

- Mesurer le temps d'exécution
- Tester avec de grandes quantités de données
- Identifier les goulots d'étranglement

### Couverture de Code

- **Objectif** : > 80% de couverture
- **Outils** : Jest avec `jest --coverage`
- **Rapport** : Généré dans le dossier `coverage/`

---

## 📚 Documentation

### Mettre à Jour la Documentation

La documentation doit être mise à jour **à chaque modification du code**.

#### Documentation Technique

- **Fichier** : `docs/technical.md`
- **Contenu** :
  - Architecture
  - Modules
  - Flux de données
  - Décisions techniques
  - Exemples de code

#### Guide Utilisateur

- **Fichier** : `docs/user_guide.md`
- **Contenu** :
  - Installation
  - Configuration
  - Utilisation
  - Dépannage
  - FAQ

#### README

- **Fichier** : `README.md`
- **Contenu** :
  - Description du projet
  - Installation
  - Structure
  - Contribution
  - Licence

### Format de la Documentation

- Utiliser **Markdown** pour la documentation
- Utiliser des **titres hiérarchiques** (`#`, `##`, `###`)
- Inclure des **exemples de code** quand pertinent
- Inclure des **tableaux** pour les configurations et options
- Inclure des **liens** vers des ressources externes

---

## 📤 Soumission des Modifications

### 1. Vérifier la Liste de Contrôle

Avant de soumettre une Pull Request, vérifiez que :

- [ ] Le code suit les conventions de code
- [ ] Tous les tests passent
- [ ] La couverture de code est > 80%
- [ ] Le code est documenté avec JSDoc
- [ ] La documentation est mise à jour
- [ ] Aucun secret (clé API, etc.) n'est commité
- [ ] Les modifications sont testées manuellement

### 2. Remplir la Description de la Pull Request

**Titre** :
- Utiliser le format : `type: description`
- Exemples :
  - `feat: Ajout du support de Ollama`
  - `fix: Correction de l'indexation incrémentale`
  - `docs: Mise à jour de la documentation`
  - `refactor: Réorganisation du module d'indexation`

**Description** :
- Décrire les modifications
- Expliquer le **pourquoi** (contexte, problème résolu)
- Expliquer le **comment** (implémentation)
- Inclure des **captures d'écran** si applicable
- Mentionner les **tests** ajoutés ou modifiés
- Mentionner la **documentation** mise à jour

**Exemple** :

```markdown
## Description

### Problème
Les emails modifiés n'étaient pas réindexés automatiquement.

### Solution
Ajout d'un écouteur d'événements pour détecter les modifications d'emails et déclencher une réindexation.

### Modifications
- `src/background.js` : Ajout de l'écouteur `browser.messages.onModified`
- `src/modules/indexation/indexer.js` : Ajout de la fonction `reindexModifiedEmail`

### Tests
- Ajout de tests pour la réindexation automatique
- Vérification manuelle avec Thunderbird

### Documentation
- Mise à jour de `docs/technical.md` avec le nouveau flux
```

### 3. Attendre la Revue

- Un mainteneur examinera votre Pull Request
- Des commentaires peuvent être ajoutés
- Vous devrez peut-être apporter des modifications
- Une fois approuvée, la Pull Request sera mergée

---

## 👀 Revue de Code

### Critères de Revue

1. **Fonctionnalité** :
   - Le code fait-il ce qu'il est censé faire ?
   - Les cas edge sont-ils gérés ?
   - Les erreurs sont-elles correctement gérées ?

2. **Qualité du Code** :
   - Le code suit-il les conventions ?
   - Le code est-il lisible et maintenable ?
   - Les noms sont-ils descriptifs ?
   - Y a-t-il des duplications de code ?

3. **Tests** :
   - Les tests couvrent-ils toutes les fonctionnalités ?
   - Les tests sont-ils robustes ?
   - La couverture de code est-elle suffisante ?

4. **Documentation** :
   - Le code est-il documenté ?
   - La documentation utilisateur est-elle mise à jour ?
   - Les changements sont-ils documentés ?

5. **Sécurité** :
   - Y a-t-il des failles de sécurité ?
   - Les données utilisateur sont-elles protégées ?
   - Les clés API sont-elles correctement gérées ?

6. **Performances** :
   - Le code est-il performant ?
   - Y a-t-il des goulots d'étranglement ?
   - Les opérations coûteuses sont-elles optimisées ?

---

## ✨ Ajouter de Nouvelles Fonctionnalités

### 1. Créer un Nouveau Module

1. Créer un nouveau dossier dans `src/modules/`
2. Créer les fichiers nécessaires (`.js`)
3. Ajouter la documentation JSDoc
4. Exporter les fonctions nécessaires

### 2. Intégrer le Module

1. Importer le module dans les fichiers nécessaires
2. Utiliser les fonctions exportées
3. Gérer les erreurs
4. Ajouter des logs

### 3. Écrire des Tests

1. Créer un fichier de test dans `tests/unit/` ou `tests/integration/`
2. Écrire des tests pour toutes les fonctions
3. Utiliser des mocks pour les dépendances externes
4. Vérifier la couverture de code

### 4. Mettre à Jour la Documentation

1. Mettre à jour `docs/technical.md` avec la nouvelle fonctionnalité
2. Mettre à jour `docs/user_guide.md` si applicable
3. Mettre à jour `README.md` si nécessaire

---

## 🤖 Ajouter le Support d'un Nouveau LLM

### 1. Créer un Nouveau Client

1. Créer un fichier dans `src/modules/generation/` :
   ```bash
   touch src/modules/generation/nouveauLLMClient.js
   ```

2. Implémenter le client :
   ```javascript
   /**
    * Client pour NouveauLLM
    * @module modules/generation/nouveauLLMClient
    */

   // Utilisation de fetch API native
   import { logInfo, logError } from '../../utils/logger.js';
   import { getConfig } from '../../config/storageManager.js';

   /**
    * Appelle l'API NouveauLLM
    * @param {string} prompt - Le prompt à envoyer
    * @param {Object} [options] - Options supplémentaires
    * @returns {Promise<Object>} Réponse de l'API
    */
   export async function callNouveauLLMAPI(prompt, options = {}) {
     try {
       const config = await getConfig();
       const llmConfig = config.rag?.nouveauLLM || {};

       // Vérifier la configuration
       if (!llmConfig.endpoint || !llmConfig.apiKey) {
         return {
           success: false,
           error: 'Configuration NouveauLLM invalide',
         };
       }

       // Appeler l'API
       const response = await axios.post(
         `${llmConfig.endpoint}/api/endpoint`,
         { prompt, ...options },
         {
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${llmConfig.apiKey}`,
           },
         }
       );

       return {
         success: true,
         text: response.data.choices[0].text,
         model: response.data.model,
       };
     } catch (error) {
       await logError(error, 'Appel API NouveauLLM');
       return {
         success: false,
         error: error.message,
       };
     }
   }

   /**
    * Génère une réponse avec contexte
    * @param {string} context - Le contexte
    * @param {string} question - La question
    * @returns {Promise<Object>} Réponse générée
    */
   export async function generateResponseWithContext(context, question) {
     const prompt = buildRAGPrompt(context, question);
     return await callNouveauLLMAPI(prompt);
   }

   /**
    * Construit un prompt pour le RAG
    * @param {string} context - Le contexte
    * @param {string} question - La question
    * @returns {string} Le prompt formaté
    */
   export function buildRAGPrompt(context, question) {
     return `Contexte : ${context}\n\nQuestion : ${question}\n\nRéponse :`;
   }
   ```

### 2. Mettre à Jour l'Orchestrateur RAG

1. Importer le nouveau client dans `ragOrchestrator.js` :
   ```javascript
   import { callNouveauLLMAPI, generateResponseWithContext as generateWithNouveauLLM } from './nouveauLLMClient.js';
   ```

2. Ajouter le support dans `performRAG` :
   ```javascript
   if (llmType === 'nouveau_llm') {
     ragResult = await generateWithNouveauLLM(formattedContext, question);
   } else if (llmType === 'local') {
     ragResult = await generateWithOllama(formattedContext, question);
   } else {
     ragResult = await generateWithMistral(formattedContext, question);
   }
   ```

### 3. Mettre à Jour la Configuration

1. Mettre à jour `defaultConfig.js` :
   ```javascript
   rag: {
     type: 'api_externe',
     api: { /* Mistral */ },
     local: { /* Ollama */ },
     nouveauLLM: {
       endpoint: 'https://api.nouveau-llm.com/v1',
       apiKey: '',
     },
   },
   ```

### 4. Mettre à Jour l'UI

1. Ajouter l'option dans la configuration UI :
   ```javascript
   // Dans sidebar.js
   const llmOptions = [
     { value: 'api_externe', label: 'Mistral AI' },
     { value: 'local', label: 'Ollama' },
     { value: 'nouveau_llm', label: 'Nouveau LLM' },
   ];
   ```

### 5. Écrire des Tests

1. Créer un fichier de test :
   ```bash
   touch tests/unit/nouveauLLMClient.test.js
   ```

2. Écrire des tests :
   ```javascript
   import { buildRAGPrompt } from '../../src/modules/generation/nouveauLLMClient.js';

   describe('Nouveau LLM Client', () => {
     test('should build a RAG prompt', () => {
       const prompt = buildRAGPrompt('contexte', 'question');
       expect(prompt).toContain('Contexte : contexte');
       expect(prompt).toContain('Question : question');
     });
   });
   ```

---

## 🌍 Ajouter le Support d'une Nouvelle Langue

### 1. Ajouter les Stop Words

1. Mettre à jour `queryProcessor.js` :
   ```javascript
   // Ajouter les stop words pour la nouvelle langue
   const SPANISH_STOP_WORDS = new Set([
     'el', 'la', 'los', 'las', 'de', 'del', 'al', 'y', 'o', 'que', 'qui',
     // ... autres stop words
   ]);

   // Mettre à jour la détection de langue
   function detectLanguage(query) {
     // Ajouter la détection pour l'espagnol
     const spanishCount = countStopWords(query, SPANISH_STOP_WORDS);
     
     if (spanishCount > frenchCount && spanishCount > englishCount) {
       return 'es';
     }
     // ...
   }

   // Mettre à jour la suppression des stop words
   function removeStopWords(query, language = null) {
     const detectedLanguage = language || detectLanguage(query);
     const stopWords = detectedLanguage === 'fr' ? FRENCH_STOP_WORDS :
                       detectedLanguage === 'en' ? ENGLISH_STOP_WORDS :
                       detectedLanguage === 'es' ? SPANISH_STOP_WORDS :
                       new Set();
     // ...
   }
   ```

### 2. Mettre à Jour les Prompts

1. Mettre à jour les prompts dans `apiClient.js` et `ollamaClient.js` :
   ```javascript
   // Ajouter des instructions pour la nouvelle langue
   if (language === 'es') {
     prompt += '\nResponde en español si la pregunta está en español.';
   }
   ```

### 3. Mettre à Jour la Configuration

1. Mettre à jour `defaultConfig.js` :
   ```javascript
   // Ajouter la nouvelle langue aux langues supportées
   SUPPORTED_LANGUAGES = ['fr', 'en', 'es'];
   ```

### 4. Écrire des Tests

1. Ajouter des tests pour la nouvelle langue :
   ```javascript
   test('should detect Spanish for Spanish text', () => {
     const spanishText = 'Hola cómo estás hoy';
     const language = detectLanguage(spanishText);
     expect(language).toBe('es');
   });

   test('should remove Spanish stop words', () => {
     const text = 'el la los de del';
     const cleaned = removeStopWords(text, 'es');
     expect(cleaned).toBe('');
   });
   ```

### 5. Mettre à Jour la Documentation

1. Mettre à jour `docs/user_guide.md` :
   ```markdown
   ### Langues Supportées

   - Français
   - Anglais
   - Espagnol (nouveau!)
   ```

---

## 📞 Contact

Pour toute question ou suggestion :

- **GitHub Issues** : [https://github.com/jgn35/thunderbird-IA-search/issues](https://github.com/jgn35/thunderbird-IA-search/issues)
- **GitHub Discussions** : [https://github.com/jgn35/thunderbird-IA-search/discussions](https://github.com/jgn35/thunderbird-IA-search/discussions)
- **Email** : jgn35@protonmail.com

---

## 🙏 Remerciements

Merci à tous les contributeurs qui ont aidé à améliorer ce projet !

Votre contribution, qu'elle soit grande ou petite, est précieuse et aide à faire de ce projet un outil meilleur pour tout le monde.

Happy coding! 🎉
