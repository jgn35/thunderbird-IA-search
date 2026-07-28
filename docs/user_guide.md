# Guide Utilisateur - Thunderbird RAG Search Extension

## 📖 Table des Matières

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration Initiale](#configuration-initiale)
4. [Utilisation de Base](#utilisation-de-base)
5. [Fonctionnalités Avancées](#fonctionnalités-avancées)
6. [Configuration du RAG](#configuration-du-rag)
7. [Dépannage](#dépannage)
8. [Questions Fréquentes](#questions-fréquentes)

---

## 🎯 Introduction

**Thunderbird RAG Search** est une extension qui vous permet de :

- 🔍 **Indexer** vos emails pour une recherche rapide
- 🧠 **Rechercher** des informations spécifiques dans vos emails
- 💬 **Poser des questions** en langage naturel et obtenir des réponses basées sur vos emails
- ⚡ **Choisir** entre un LLM local (Ollama) ou une API externe (Mistral AI)

### Cas d'Usage

- Trouver des informations précises dans vos anciens emails
- Résumer des conversations email
- Rechercher des dates, noms ou détails spécifiques
- Générer des réponses basées sur le contenu de vos emails

### Public Cible

- Utilisateurs personnels de Thunderbird
- Professionnels gérant de nombreux emails
- Toute personne ayant besoin de rechercher efficacement dans ses emails

---

## 📥 Installation

### Prérequis

- **Thunderbird** : Version 102.0 ou supérieure
- **Connexion Internet** : Pour utiliser l'API Mistral (optionnel si vous utilisez Ollama)

### Installation pour les Développeurs

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

### Installation pour les Utilisateurs Finaux

*À venir : Package .xpi pour installation directe depuis le Mozilla Add-ons Store.*

---

## ⚙️ Configuration Initiale

### Première Ouverture

1. Après l'installation, ouvrez Thunderbird
2. Cliquez sur l'icône de l'extension dans la barre d'outils (ou allez dans `Menu ▶ Add-ons`)
3. La barre latérale de l'extension s'ouvre

### Sélection des Dossiers à Indexer

1. Dans l'onglet **"Indexation"** :
   - Cliquez sur `Sélectionner les dossiers`
   - Cochez les dossiers que vous souhaitez indexer
   - Le dossier **Spam** est exclu par défaut (configurable)
   - Cliquez sur `Enregistrer`

2. **Lancer l'indexation** :
   - Cliquez sur `Indexer maintenant`
   - L'indexation commence et affiche la progression
   - Une notification apparaît une fois terminée

### Configuration de Base

Dans l'onglet **"Configuration"** :

| Option | Description | Valeur par défaut |
|--------|-------------|-------------------|
| Dossiers exclus | Dossiers à exclure de l'indexation | `['Spam']` |
| Indexer les pièces jointes | Inclure les pièces jointes dans l'indexation | `false` |
| Taille maximale des emails | Taille maximale en octets | `10485760` (10 Mo) |

---

## 🎯 Utilisation de Base

### Recherche Simple

1. Dans l'onglet **"Recherche"** :
   - Entrez votre requête dans le champ de recherche
   - Appuyez sur `Entrée` ou cliquez sur `Rechercher`
   - Les résultats s'affichent avec :
     - Sujet de l'email
     - Extrait du contenu
     - Dossier
     - Date
     - Score de pertinence

2. **Filtres disponibles** :
   - Par dossier
   - Par date (de/à)
   - Par expéditeur
   - Par destinataire

### Recherche Avancée

1. Cliquez sur `Recherche avancée`
2. Remplissez les critères :
   - Requête (obligatoire)
   - Dossiers à inclure
   - Dossiers à exclure
   - Date de début
   - Date de fin
   - Expéditeur
   - Destinataire
3. Cliquez sur `Rechercher`

### RAG (Retrieval-Augmented Generation)

1. Dans l'onglet **"RAG"** :
   - Entrez votre question en langage naturel
   - Exemples :
     - "Quelle est l'heure de la réunion de demain ?"
     - "Qu'a dit Jean dans son dernier email ?"
     - "Résumé la conversation avec Marie"
   - Cliquez sur `Poser la question`
   - L'extension :
     - Recherche les emails pertinents
     - Extrait le contexte
     - Génère une réponse basée sur vos emails

2. **Résultats** :
   - Réponse générée par le LLM
   - Liste des emails utilisés comme contexte
   - Score de pertinence pour chaque email

---

## 🚀 Fonctionnalités Avancées

### Indexation Incrémentale

L'extension indexe automatiquement :
- Les **nouveaux emails** arrivant dans les dossiers sélectionnés
- Les **emails modifiés**
- Les **emails déplacés** vers un dossier indexé

**Désactivation** :
- Dans l'onglet **"Configuration"**
- Décochez `Indexation automatique`
- Cliquez sur `Enregistrer`

### Indexation Manuelle

Pour forcer une réindexation complète :
1. Allez dans l'onglet **"Indexation"**
2. Cliquez sur `Réindexer tout`
3. Confirmez l'action

### Suppression de l'Index

Pour supprimer tous les emails indexés :
1. Allez dans l'onglet **"Indexation"**
2. Cliquez sur `Supprimer l'index`
3. Confirmez l'action

⚠️ **Attention** : Cette action est irréversible. Vous devrez réindexer vos emails.

### Historique des Recherches

L'extension conserve un historique de vos recherches :
- Dans l'onglet **"Historique"**
- Liste des dernières recherches
- Possibilité de relancer une recherche
- Possibilité de supprimer l'historique

### Export des Logs

Pour diagnostiquer des problèmes :
1. Allez dans l'onglet **"Logs"**
2. Cliquez sur `Exporter les logs`
3. Choisissez un emplacement pour enregistrer le fichier

---

## ⚡ Configuration du RAG

### Choix du LLM

Deux options disponibles :

#### 1. API Externe (Mistral AI) - Recommandé

**Avantages** :
- ✅ Pas besoin d'installer de modèle local
- ✅ Modèles optimisés pour le français et l'anglais
- ✅ Performances élevées
- ✅ Mises à jour automatiques des modèles

**Inconvénients** :
- ❌ Nécessite une clé API
- ❌ Nécessite une connexion internet
- ❌ Coût potentiel (selon l'utilisation)

**Configuration** :

1. Allez dans l'onglet **"RAG"**
2. Sélectionnez `API Externe (Mistral AI)`
3. Remplissez les champs :
   - **Endpoint** : `https://api.mistral.ai/v1` (par défaut)
   - **Endpoint Embeddings** : `https://api.mistral.ai/v1/embeddings` (par défaut)
   - **Clé API** : Votre clé API Mistral
4. Cliquez sur `Enregistrer`

**Obtenir une clé API Mistral** :
1. Allez sur [https://console.mistral.ai/](https://console.mistral.ai/)
2. Créez un compte ou connectez-vous
3. Allez dans `Settings ▶ API Keys`
4. Générez une nouvelle clé API
5. Copiez la clé et collez-la dans la configuration

#### 2. LLM Local (Ollama)

**Avantages** :
- ✅ Pas besoin de clé API
- ✅ Pas besoin de connexion internet
- ✅ Données 100% locales
- ✅ Gratuit

**Inconvénients** :
- ❌ Nécessite d'installer Ollama
- ❌ Nécessite de télécharger les modèles
- ❌ Consommation de ressources locales
- ❌ Performances variables selon le matériel

**Configuration** :

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
   - Allez dans l'onglet **"RAG"**
   - Sélectionnez `LLM Local (Ollama)`
   - Remplissez les champs :
     - **URL** : `http://localhost:11434` (par défaut)
     - **Modèle** : `mistral-7b` (ou autre modèle téléchargé)
   - Cliquez sur `Enregistrer`

### Modèles Recommandés

#### Pour Mistral AI (API)

| Modèle | Description | Cas d'usage |
|--------|-------------|-------------|
| `mistral-tiny` | Modèle léger et rapide | Recherche simple, tests |
| `mistral-small` | Équilibre vitesse/qualité | Usage général |
| `mistral-medium` | Meilleure qualité | Réponses complexes |

#### Pour Ollama (Local)

| Modèle | Taille | RAM requise | Cas d'usage |
|--------|--------|-------------|-------------|
| `mistral-7b` | 7B | 8 Go | Usage général |
| `llama2:7b` | 7B | 8 Go | Alternative |
| `phi3:3.8b` | 3.8B | 4 Go | Léger |
| `mistral-7b-instruct` | 7B | 8 Go | Instructions |

---

## 🔧 Dépannage

### Problèmes d'Indexation

#### Aucun email indexé

**Causes possibles** :
- Aucun dossier sélectionné
- Tous les dossiers sont exclus
- Emails trop grands

**Solutions** :
1. Vérifiez que des dossiers sont sélectionnés dans l'onglet **"Indexation"**
2. Vérifiez que le dossier **Spam** n'est pas le seul sélectionné (il est exclu par défaut)
3. Vérifiez la taille maximale des emails dans la configuration
4. Essayez de lancer une indexation manuelle

#### Indexation bloquée

**Causes possibles** :
- Problème de connexion à l'API Mistral
- Trop d'emails à indexer

**Solutions** :
1. Vérifiez votre connexion internet
2. Vérifiez la configuration des embeddings
3. Essayez d'indexer moins de dossiers
4. Attendez que l'indexation se termine (peut prendre du temps)

### Problèmes de Recherche

#### Aucun résultat trouvé

**Causes possibles** :
- Aucun email indexé
- Requête trop courte
- Problème avec les embeddings

**Solutions** :
1. Vérifiez que l'indexation a été exécutée
2. Essayez une requête plus longue (au moins 2 caractères)
3. Vérifiez la configuration des embeddings
4. Essayez une recherche par mots-clés simple

#### Résultats non pertinents

**Causes possibles** :
- Peu d'emails indexés
- Requête trop vague
- Problème avec les embeddings

**Solutions** :
1. Indexez plus d'emails
2. Soyez plus précis dans votre requête
3. Vérifiez la configuration des embeddings
4. Essayez avec un autre LLM

### Problèmes API Mistral

#### Erreur "Clé API invalide"

**Solution** :
1. Vérifiez que votre clé API est correcte
2. Générez une nouvelle clé API sur le tableau de bord Mistral
3. Vérifiez que vous n'avez pas dépassé votre quota

#### Erreur "Endpoint introuvable"

**Solution** :
1. Vérifiez l'endpoint dans la configuration
2. Utilisez `https://api.mistral.ai/v1` (par défaut)
3. Vérifiez votre connexion internet

#### Timeout

**Solution** :
1. Vérifiez votre connexion internet
2. Essayez à nouveau plus tard
3. Si le problème persiste, contactez le support Mistral

### Problèmes Ollama

#### Ollama ne répond pas

**Solutions** :
1. Vérifiez qu'Ollama est installé : `ollama --version`
2. Vérifiez qu'Ollama est en cours d'exécution : `ollama serve`
3. Vérifiez l'URL dans la configuration : `http://localhost:11434`
4. Vérifiez que le modèle est téléchargé : `ollama list`

#### Modèle introuvable

**Solution** :
1. Téléchargez le modèle : `ollama pull mistral-7b`
2. Vérifiez que le modèle est téléchargé : `ollama list`
3. Vérifiez le nom du modèle dans la configuration

#### Manque de mémoire

**Solutions** :
1. Fermez d'autres applications
2. Utilisez un modèle plus petit (ex: `phi3:3.8b`)
3. Augmentez la mémoire allouée à Ollama
4. Utilisez un GPU si disponible

---

## ❓ Questions Fréquentes

### Q: L'extension fonctionne-t-elle hors ligne ?

**R:** 
- ✅ **Oui**, si vous utilisez Ollama (LLM local)
- ❌ **Non**, si vous utilisez l'API Mistral (nécessite une connexion internet)

### Q: Mes emails sont-ils envoyés à des tiers ?

**R:** 
- ❌ **Non**, vos emails ne sont **jamais** envoyés à des tiers sans votre consentement
- Les emails sont indexés **localement** sur votre machine
- Seuls les embeddings (vecteurs numériques) sont envoyés à l'API Mistral si vous utilisez cette option
- Vous pouvez utiliser Ollama pour une solution 100% locale

### Q: Combien de temps prend l'indexation ?

**R:** 
- 100 emails : < 1 minute
- 1 000 emails : 5-10 minutes
- 10 000 emails : 30-60 minutes

Le temps dépend de :
- La taille de vos emails
- La vitesse de votre connexion internet (pour les embeddings)
- Les performances de votre machine

### Q: Puis-je indexer tous mes emails ?

**R:** 
- ✅ **Oui**, vous pouvez indexer tous vos emails
- Cependant, l'indexation de milliers d'emails peut prendre du temps
- Vous pouvez exclure certains dossiers (ex: Spam, Trash) pour gagner du temps

### Q: Comment mettre à jour l'extension ?

**R:** 
1. Pour les développeurs : `git pull` puis recharger l'extension dans Thunderbird
2. Pour les utilisateurs finaux : Mise à jour automatique via le Mozilla Add-ons Store (à venir)

### Q: Puis-je utiliser d'autres LLM ?

**R:** 
- Actuellement, seuls Mistral AI et Ollama sont supportés
- Nous prévoyons d'ajouter le support d'autres fournisseurs (OpenAI, Anthropic, etc.) dans le futur
- Vous pouvez contribuer en ajoutant le support de nouveaux fournisseurs

### Q: Comment désinstaller l'extension ?

**R:** 
1. Allez dans `Menu ▶ Add-ons et thèmes`
2. Trouvez l'extension **Thunderbird RAG Search**
3. Cliquez sur les trois points (⋮) puis `Supprimer`
4. Confirmez la suppression

### Q: Mes données sont-elles sauvegardées ?

**R:** 
- ✅ **Oui**, vos données (index, configuration) sont sauvegardées dans le stockage local de Thunderbird
- ❌ **Non**, elles ne sont pas sauvegardées dans le cloud
- Si vous désinstallez l'extension, vos données seront perdues
- Si vous réinstallez l'extension, vous devrez reconfigurer et réindexer

### Q: Puis-je exporter/importer mes données ?

**R:** 
- **Export des logs** : Oui, via l'onglet **"Logs"**
- **Export de l'index** : Non, pas encore implémenté (à venir)
- **Export de la configuration** : Non, pas encore implémenté (à venir)

---

## 📞 Support

### Signaler un Bug

1. Vérifiez que le bug n'a pas déjà été signalé
2. Ouvrez une issue sur GitHub : [https://github.com/jgn35/thunderbird-IA-search/issues](https://github.com/jgn35/thunderbird-IA-search/issues)
3. Incluez :
   - Description détaillée du bug
   - Étapes pour reproduire
   - Capture d'écran si possible
   - Version de Thunderbird
   - Version de l'extension
   - Logs exportés (si applicable)

### Contribuer

Voir le [Guide de Contribution](contributing.md) pour savoir comment contribuer au projet.

### Documentation Technique

Voir la [Documentation Technique](technical.md) pour plus de détails sur l'architecture et l'implémentation.
