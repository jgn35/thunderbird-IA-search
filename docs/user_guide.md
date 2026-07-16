# Guide Utilisateur - Thunderbird RAG Search Extension

## 📖 Table des Matières

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Première Utilisation](#première-utilisation)
4. [Fonctionnalités Principales](#fonctionnalités-principales)
   - [Indexation des Emails](#indexation-des-emails)
   - [Recherche dans les Emails](#recherche-dans-les-emails)
   - [Recherche RAG](#recherche-rag)
   - [Configuration](#configuration)
5. [Configuration Avancée](#configuration-avancée)
6. [Dépannage](#dépannage)
7. [Questions Fréquentes](#questions-fréquentes)

---

## 🎯 Introduction

**Thunderbird RAG Search** est une extension pour Mozilla Thunderbird qui vous permet de :

✅ **Indexer** vos emails pour une recherche rapide
✅ **Rechercher** des informations spécifiques dans vos emails
✅ **Générer des réponses** intelligentes basées sur le contenu de vos emails (RAG)
✅ **Choisir** entre un LLM local (Ollama) ou une API externe (Mistral AI)

Cette extension est conçue pour un **usage personnel** et ne partage **aucune donnée** sans votre consentement explicite.

---

## 📥 Installation

### Prérequis

- **Thunderbird** : Version 102.0 ou supérieure
- **Espace disque** : Environ 100 Mo par 10 000 emails (pour ChromaDB)
- **Mémoire** : 2 Go minimum recommandés

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
   - Ouvrez Thunderbird
   - Allez dans `Menu (☰) → Add-ons et thèmes → Outils pour les développeurs`
   - Cliquez sur `Charger un module complémentaire temporaire`
   - Sélectionnez le fichier `manifest.json` dans le dossier du projet

4. **Redémarrer Thunderbird** si nécessaire

### Installation pour les Utilisateurs Finaux (à venir)

*Une version packagée (.xpi) sera disponible prochainement pour une installation directe.*

---

## 🚀 Première Utilisation

### Étape 1 : Sélectionner les Dossiers à Indexer

1. Ouvrez la barre latérale de l'extension en cliquant sur l'icône **RAG Search** dans la barre d'outils de Thunderbird
2. Allez dans l'onglet **Configuration**
3. Dans la section **Indexation**, sélectionnez les dossiers que vous souhaitez indexer dans le champ **Dossiers à indexer**
   - Maintenez la touche `Ctrl` (ou `Cmd` sur Mac) enfoncée pour sélectionner plusieurs dossiers
4. Cliquez sur **Sauvegarder la configuration**

### Étape 2 : Configurer le LLM

Choisissez entre deux options pour le traitement du langage naturel :

#### Option A : API Externe (Mistral AI)

1. Dans l'onglet **Configuration**, section **RAG**
2. Sélectionnez **API Externe (Mistral AI)**
3. Entrez votre **Clé API Mistral** (disponible sur [Mistral AI](https://mistral.ai/))
4. Vérifiez que l'**Endpoint** est correct (`https://api.mistral.ai/v1`)
5. Sélectionnez un **Modèle** (ex: `mistral-tiny`, `mistral-small`)
6. Cliquez sur **Sauvegarder la configuration**

#### Option B : LLM Local (Ollama)

1. Installez [Ollama](https://ollama.ai/) sur votre machine
2. Téléchargez un modèle compatible :
   ```bash
   ollama pull mistral-7b
   ```
3. Démarrez le serveur Ollama :
   ```bash
   ollama serve
   ```
4. Dans l'extension, sélectionnez **Local (Ollama)**
5. Vérifiez que l'**URL du serveur** est correcte (`http://localhost:11434`)
6. Entrez le **Modèle** (`mistral-7b`)
7. Cliquez sur **Vérifier le statut** pour confirmer que Ollama est accessible
8. Cliquez sur **Sauvegarder la configuration**

### Étape 3 : Indexer vos Emails

1. Retournez dans l'onglet **Recherche**
2. Cliquez sur **Indexer tous les emails**
3. Attendez la fin de l'indexation (un indicateur de progression s'affiche)
4. Une fois terminée, le nombre d'emails indexés s'affiche

✅ **Vos emails sont maintenant prêts pour la recherche !**

---

## ✨ Fonctionnalités Principales

### Indexation des Emails

#### Indexation Complète

- **Quand l'utiliser** : Première utilisation, ou après avoir ajouté de nouveaux dossiers
- **Comment faire** : Cliquez sur **Indexer tous les emails**
- **Durée** : Environ 30-45 minutes pour 10 000 emails (sur une machine standard)

#### Indexation Incrémentale

- **Quand l'utiliser** : Pour mettre à jour l'index avec les emails récemment reçus ou modifiés
- **Comment faire** : Cliquez sur **Indexer les modifiés**
- **Durée** : Quelques secondes à quelques minutes selon le nombre d'emails modifiés

#### Vider l'Index

- **Quand l'utiliser** : Pour réinitialiser complètement l'index
- **Comment faire** : Cliquez sur **Vider l'index** (une confirmation sera demandée)
- **Attention** : Cette action ne peut pas être annulée

**Statistiques d'Indexation** :
- **Emails indexés** : Nombre total d'emails dans l'index
- **Dernière indexation** : Date et heure de la dernière indexation complète
- **Indexation en cours** : Indique si une indexation est actuellement en cours

---

### Recherche dans les Emails

#### Recherche Simple

1. Dans l'onglet **Recherche**, entrez votre requête dans le champ de recherche
2. Appuyez sur `Entrée` ou cliquez sur le bouton de recherche
3. Les résultats s'affichent avec :
   - **Sujet** de l'email
   - **Expéditeur**, **Date**, **Dossier**
   - **Extrait** du contenu
   - **Score** de pertinence

#### Recherche Avancée

Pour affiner vos résultats, vous pouvez utiliser les filtres suivants dans la configuration :

- **Dossiers** : Limiter la recherche à des dossiers spécifiques
- **Date** : Filtrer par plage de dates
- **Expéditeur/Destinataire** : Filtrer par personne

---

### Recherche RAG

Le **RAG (Retrieval-Augmented Generation)** combine la recherche vectorielle avec un modèle de langage pour fournir des réponses précises basées sur vos emails.

#### Comment utiliser le RAG

1. Activez la case **Utiliser RAG** dans l'onglet Recherche
2. Sélectionnez le type de LLM (API Externe ou Local)
3. Entrez votre question en français ou en anglais
4. L'extension va :
   - Rechercher les emails pertinents
   - Extraire les informations clés
   - Générer une réponse basée sur ces informations

#### Exemples de Questions RAG

| Question | Résultat |
|----------|----------|
| "Quelle est la date de la réunion avec l'équipe marketing ?" | L'extension trouve les emails contenant des informations sur la réunion et répond avec la date exacte |
| "Quel est le montant de la facture n°12345 ?" | Recherche dans vos emails pour trouver le montant de la facture |
| "Qui a envoyé le rapport trimestriel ?" | Identifie l'expéditeur du rapport dans vos emails |
| "Résumé de la conversation avec Jean Dupont" | Génère un résumé de tous les emails échangés avec Jean Dupont |

#### Limites du RAG

- Le RAG ne peut répondre que **basé sur les emails indexés**
- Si aucun email pertinent n'est trouvé, une réponse générique sera affichée
- La qualité de la réponse dépend de la qualité des emails indexés

---

### Configuration

#### Onglet Configuration

L'onglet **Configuration** vous permet de personnaliser le comportement de l'extension.

**Section Indexation** :

| Option | Description | Valeur par Défaut |
|--------|-------------|-------------------|
| Dossiers exclus | Dossiers à exclure de l'indexation | Spam |
| Indexer les pièces jointes | Si activé, les pièces jointes seront indexées | Désactivé |
| Taille max des emails | Taille maximale des emails à indexer (en Mo) | 10 Mo |

**Section RAG** :

| Option | Description | Valeur par Défaut |
|--------|-------------|-------------------|
| Type de LLM | API Externe ou Local | API Externe |
| Endpoint API | URL de l'API Mistral | https://api.mistral.ai/v1 |
| Clé API | Votre clé API Mistral | - |
| Modèle API | Modèle à utiliser avec Mistral | mistral-tiny |
| URL Ollama | URL du serveur Ollama | http://localhost:11434 |
| Modèle Ollama | Modèle à utiliser avec Ollama | mistral-7b |

---

## ⚙ Configuration Avancée

### Personnalisation des Dossiers Exclus

Par défaut, seul le dossier **Spam** est exclu de l'indexation. Vous pouvez ajouter d'autres dossiers :

1. Allez dans **Configuration → Indexation**
2. Dans le champ **Dossiers exclus**, entrez les noms des dossiers à exclure
3. Séparer les noms par des virgules (ex: `Spam, Trash, Archives`)
4. Sauvegardez la configuration

### Indexation des Pièces Jointes

⚠️ **Attention** : L'indexation des pièces jointes peut :
- Augmenter considérablement la taille de l'index
- Ralentir l'indexation
- Consommer plus de mémoire

Pour activer :
1. Allez dans **Configuration → Indexation**
2. Cochez **Indexer les pièces jointes**
3. Sauvegardez la configuration
4. Réindexez vos emails

### Changement de la Taille Maximale des Emails

Les emails trop volumineux sont ignorés par défaut (10 Mo). Pour modifier cette limite :

1. Allez dans **Configuration → Indexation**
2. Modifiez la valeur **Taille max des emails (Mo)**
3. Sauvegardez la configuration

### Utilisation de Plusieurs Clés API

Si vous avez plusieurs clés API (pour différents modèles ou quotas), vous pouvez :

1. Sauvegarder vos clés API dans un gestionnaire de mots de passe
2. Copier-coller la clé appropriée dans la configuration lorsque nécessaire
3. Changer de clé API et réessayer en cas d'erreur

### Optimisation des Performances

Pour améliorer les performances :

- **Limiter le nombre de dossiers indexés** : Indexez uniquement les dossiers importants
- **Réduire la taille maximale des emails** : 5-10 Mo est généralement suffisant
- **Désactiver l'indexation des pièces jointes** : Sauf si absolument nécessaire
- **Utiliser un LLM local** : Ollama peut être plus rapide que les API externes (mais nécessite des ressources locales)

---

## 🐛 Dépannage

### L'extension ne s'affiche pas

**Solutions** :
1. Vérifiez que l'extension est bien chargée dans Thunderbird
2. Redémarrez Thunderbird
3. Vérifiez la console pour les erreurs (`Menu → Plus d'outils → Console web`)

### Aucune indexation ne se produit

**Causes possibles** :
- Aucun dossier sélectionné pour l'indexation
- Tous les dossiers sélectionnés sont vides
- Problème de permissions

**Solutions** :
1. Vérifiez que des dossiers sont bien sélectionnés dans la configuration
2. Essayez d'indexer manuellement avec le bouton **Indexer tous les emails**
3. Vérifiez les logs dans l'onglet **Logs**

### Erreur "Clé API invalide"

**Causes possibles** :
- La clé API est incorrecte
- La clé API a expiré
- Le compte Mistral AI n'a plus de crédits

**Solutions** :
1. Vérifiez que la clé API est correcte
2. Générez une nouvelle clé API sur [Mistral AI](https://mistral.ai/)
3. Vérifiez votre solde de crédits

### Ollama non accessible

**Causes possibles** :
- Ollama n'est pas installé
- Le serveur Ollama n'est pas démarré
- L'URL du serveur est incorrecte

**Solutions** :
1. Installez Ollama : [https://ollama.ai/](https://ollama.ai/)
2. Démarrez le serveur : `ollama serve`
3. Vérifiez que l'URL est correcte (`http://localhost:11434`)
4. Cliquez sur **Vérifier le statut** dans la configuration

### Indexation très lente

**Causes possibles** :
- Trop d'emails à indexer
- Emails très volumineux
- Ressources machine insuffisantes

**Solutions** :
1. Réduisez le nombre de dossiers indexés
2. Diminuez la taille maximale des emails
3. Désactivez l'indexation des pièces jointes
4. Indexez par petits lots (utilisez **Indexer les modifiés** régulièrement)

### Recherche sans résultats

**Causes possibles** :
- L'index est vide
- La requête ne correspond à aucun email
- Les emails pertinents ne sont pas indexés

**Solutions** :
1. Vérifiez que des emails sont bien indexés (onglet Recherche)
2. Essayez une requête plus générale
3. Vérifiez que les dossiers contenant les emails pertinents sont sélectionnés
4. Réindexez vos emails

---

## ❓ Questions Fréquentes

### Q : Mes emails sont-ils envoyés à des serveurs externes ?
**R** : Non, sauf si vous utilisez explicitement une API externe (Mistral AI). Avec Ollama, tout reste local sur votre machine. Même avec Mistral AI, seuls les prompts et réponses sont envoyés, jamais vos emails bruts.

### Q : Puis-je indexer tous mes emails, y compris les anciens ?
**R** : Oui, l'extension peut indexer tous les emails des dossiers sélectionnés, quel que soit leur âge.

### Q : Combien d'espace disque l'index utilise-t-il ?
**R** : Environ 10-20 Ko par email pour ChromaDB. Pour 10 000 emails, comptez environ 100-200 Mo.

### Q : Puis-je utiliser l'extension avec d'autres fournisseurs de LLM ?
**R** : Actuellement, seuls Mistral AI et Ollama sont supportés. L'ajout d'autres fournisseurs est prévu pour les futures versions.

### Q : Comment puis-je ajouter une nouvelle langue ?
**R** : L'extension supporte actuellement le français et l'anglais. Pour ajouter une nouvelle langue, vous devez :
1. Ajouter les stop words pour la langue dans `queryProcessor.js`
2. Mettre à jour la détection de langue
3. Tester la nouvelle langue

*Voir la [documentation technique](technical.md) pour plus de détails.*

### Q : L'extension fonctionne-t-elle hors ligne ?
**R** : Oui, si vous utilisez Ollama (LLM local). Avec Mistral AI, une connexion internet est nécessaire.

### Q : Puis-je exporter/importer mon index ?
**R** : Actuellement, l'export/import de l'index n'est pas supporté. Cette fonctionnalité est prévue pour les futures versions.

### Q : Comment puis-je contribuer au projet ?
**R** : Les contributions sont les bienvenues ! Voir le [README](README.md) pour les instructions.

---

## 📧 Support

Pour toute question ou problème non résolu par ce guide :

1. Consultez les [logs](#dépannage) dans l'extension
2. Vérifiez les [problèmes connus](#dépannage)
3. Ouvrez une issue sur GitHub : [https://github.com/jgn35/thunderbird-IA-search/issues](https://github.com/jgn35/thunderbird-IA-search/issues)

---

*Guide utilisateur mis à jour le : {date}*
