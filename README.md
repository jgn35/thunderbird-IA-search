# Thunderbird RAG Search Extension

**Extension Thunderbird pour l'indexation et la recherche RAG (Retrieval-Augmented Generation) avec IndexedDB et LLM (Mistral/Ollama)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/jgn35/thunderbird-IA-search/actions/workflows/tests.yml/badge.svg)](https://github.com/jgn35/thunderbird-IA-search/actions/workflows/tests.yml)

## 📚 À propos

Cette extension permet aux utilisateurs de :

- 🔍 **Indexer** les emails des comptes et répertoires sélectionnés (le dossier **Spam** est exclu par défaut)
- 🧠 **Rechercher** des informations spécifiques dans les emails via une interface dédiée
- 💬 **Générer** des résumés ou des réponses basées sur le contenu des emails en utilisant le **RAG**
- ⚡ **Choisir** entre un **LLM local (Ollama)** ou une **API externe (Mistral AI)** pour le traitement

## 🚀 Fonctionnalités

### ✅ Indexation
- Indexation complète des emails des dossiers sélectionnés
- Indexation incrémentale des emails modifiés
- Exclusion automatique du dossier Spam (configurable)
- Génération d'embeddings via API Mistral
- Stockage local avec IndexedDB
- Réindexation automatique des emails modifiés
- Suppression automatique des emails supprimés

### ✅ Recherche
- Recherche vectorielle utilisant la similarité cosinus
- Recherche par mots-clés (fallback)
- Détection automatique de la langue (français, anglais)
- Filtrage par dossier, date, expéditeur, destinataire
- Suggestions de recherche

### ✅ RAG (Retrieval-Augmented Generation)
- Orchestration complète du pipeline RAG
- Génération de réponses basées sur le contexte des emails
- Support de Mistral AI (API externe)
- Support de Ollama (LLM local)
- Résumé de conversations

### ✅ Interface Utilisateur
- Barre latérale intégrée à Thunderbird
- Sélection des dossiers à indexer
- Configuration complète du RAG
- Affichage des résultats de recherche
- Affichage des résultats RAG
- Historique des recherches
- Export des logs

## 📋 Configuration Requise

### Pour les Développeurs

- **Thunderbird** : Version 102.0 ou supérieure
- **Node.js** : Version 18 ou supérieure (pour le développement)
- **Yarn** : Gestionnaire de paquets recommandé

### Pour les Utilisateurs

- **Thunderbird** : Version 102.0 ou supérieure
- **Clé API Mistral** : Pour utiliser l'API Mistral (optionnel si vous utilisez Ollama)
- **Ollama** : Pour utiliser un LLM local (optionnel)

## 📥 Installation

### Pour les Développeurs

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/jgn35/thunderbird-IA-search.git
   cd thunderbird-IA-search
   ```

2. **Installer les dépendances** :
   ```bash
   yarn install
   ```

3. **Charger l'extension dans Thunderbird** :
   - Ouvrir Thunderbird
   - Aller dans `Menu ▶ Add-ons et thèmes ▶ Outils pour les développeurs`
   - Cliquer sur `Charger un module complémentaire temporaire`
   - Sélectionner le fichier `manifest.json` dans le dossier du projet

### Pour les Utilisateurs Finaux

*À venir : Package .xpi pour installation directe depuis le Mozilla Add-ons Store.*

## 🛠️ Configuration

### Configuration de Base

1. **Sélectionner les dossiers à indexer** :
   - Ouvrir la barre latérale de l'extension
   - Aller dans l'onglet **"Indexation"**
   - Cliquer sur `Sélectionner les dossiers`
   - Cochez les dossiers souhaités
   - Cliquer sur `Enregistrer`

2. **Lancer l'indexation** :
   - Cliquer sur `Indexer maintenant`
   - Attendre la fin de l'indexation

### Configuration du RAG

#### Option 1 : API Mistral (Recommandé)

1. **Obtenir une clé API** :
   - Allez sur [https://console.mistral.ai/](https://console.mistral.ai/)
   - Créez un compte ou connectez-vous
   - Allez dans `Settings ▶ API Keys`
   - Générez une nouvelle clé API

2. **Configurer l'extension** :
   - Dans l'onglet **"RAG"**
   - Sélectionnez `API Externe (Mistral AI)`
   - Remplissez les champs :
     - **Endpoint** : `https://api.mistral.ai/v1`
     - **Endpoint Embeddings** : `https://api.mistral.ai/v1/embeddings`
     - **Clé API** : Votre clé API Mistral
   - Cliquez sur `Enregistrer`

#### Option 2 : Ollama (Local)

1. **Installer Ollama** :
   ```bash
   # Linux/Mac
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows (PowerShell)
   Invoke-WebRequest -Uri "https://ollama.ai/install.ps1" -UseBasicParsing | Invoke-Expression
   ```

2. **Démarrer Ollama** :
   ```bash
   ollama serve
   ```

3. **Télécharger un modèle** :
   ```bash
   ollama pull mistral-7b
   ```

4. **Configurer l'extension** :
   - Dans l'onglet **"RAG"**
   - Sélectionnez `LLM Local (Ollama)`
   - Remplissez les champs :
     - **URL** : `http://localhost:11434`
     - **Modèle** : `mistral-7b`
   - Cliquez sur `Enregistrer`

## 🎯 Utilisation

### Recherche Simple

1. Dans l'onglet **"Recherche"**
2. Entrez votre requête
3. Appuyez sur `Entrée` ou cliquez sur `Rechercher`
4. Consultez les résultats

### Recherche RAG

1. Dans l'onglet **"RAG"**
2. Entrez votre question en langage naturel
3. Cliquez sur `Poser la question`
4. Consultez la réponse générée et les emails utilisés comme contexte

### Exemples de Requêtes

- "Quelle est l'heure de la réunion de demain ?"
- "Qu'a dit Jean dans son dernier email ?"
- "Résumé la conversation avec Marie"
- "Quels sont les projets en cours ?"
- "Trouve tous les emails de John"

## 📊 Technologies Utilisées

| Technologie | Version | Description |
|-------------|---------|-------------|
| JavaScript | ES6+ | Langage principal |
| WebExtensions API | - | API Thunderbird |
| IndexedDB | - | Stockage local |
| Axios | ^1.6.0 | Requêtes HTTP |
| Jest | ^29.7.0 | Tests |
| Yarn | - | Gestion des dépendances |

## 📁 Structure du Projet

```
thunderbird-rag-extension/
├── src/
│   ├── modules/
│   │   ├── indexation/           # Module d'indexation
│   │   ├── recherche/            # Module de recherche
│   │   ├── generation/           # Module de génération (RAG)
│   │   └── ui/                   # Interface utilisateur
│   ├── config/                   # Configuration
│   ├── utils/                    # Utilitaires
│   ├── background.js             # Script de fond
│   └── content.js                # Script de contenu
├── tests/                        # Tests
│   ├── unit/                     # Tests unitaires
│   ├── integration/              # Tests d'intégration
│   └── performance/              # Tests de performance
├── docs/                         # Documentation
│   ├── technical.md              # Documentation technique
│   ├── user_guide.md             # Guide utilisateur
│   └── contributing.md           # Guide de contribution
├── .github/                      # GitHub Actions
└── package.json                  # Dépendances
```

## 🧪 Tests

### Exécution des Tests

```bash
# Tous les tests
yarn test

# Tests avec couverture
yarn test:coverage

# Tests en mode surveillance
yarn test:watch
```

### Couverture de Code

- **Objectif** : > 80% de couverture
- **Actuel** : ~90% (80 tests)

## 📖 Documentation

- [Documentation Technique](docs/technical.md) - Architecture, modules, flux de données
- [Guide Utilisateur](docs/user_guide.md) - Installation, configuration, utilisation
- [Guide de Contribution](docs/contributing.md) - Comment contribuer au projet

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre le [Guide de Contribution](docs/contributing.md) pour savoir comment contribuer.

### Étapes pour Contribuer

1. Forker le projet
2. Créer une branche (`git checkout -b feature/ma-fonctionnalité`)
3. Commiter vos modifications (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/ma-fonctionnalité`)
5. Ouvrir une Pull Request

## 📜 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- À tous les contributeurs
- À la communauté Mistral AI
- À la communauté Ollama
- À Mozilla pour Thunderbird

## 📞 Contact

- **GitHub** : [jgn35/thunderbird-IA-search](https://github.com/jgn35/thunderbird-IA-search)
- **Email** : jgn35@protonmail.com
