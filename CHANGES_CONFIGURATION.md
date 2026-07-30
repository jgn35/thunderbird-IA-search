# Changements pour la Configuration de l'Extension

## Résumé

Ce commit ajoute la possibilité de configurer l'extension **Thunderbird RAG Search** via les **options standard de Thunderbird**, en plus de la configuration existante dans la barre latérale.

## Problème Résolu

L'utilisateur ne trouvait pas comment configurer l'extension après l'avoir installée. La configuration était uniquement accessible via la barre latérale, ce qui n'est pas intuitif pour tous les utilisateurs.

## Solution Implémentée

### 1. Ajout de la page des options (`options_ui`)

**Nouveaux fichiers créés :**
- `src/modules/ui/options.html` - Page HTML des options avec 3 onglets
- `src/modules/ui/options.css` - Styles CSS pour la page des options
- `src/modules/ui/options.js` - Logique JavaScript pour la page des options

**Modifications du manifest.json :**
```json
{
  "options_ui": {
    "page": "src/modules/ui/options.html",
    "open_in_tab": true,
    "browser_style": true
  }
}
```

### 2. Structure de la page des options

La page des options est organisée en **3 onglets** :

#### Onglet "Indexation"
- Sélection des dossiers à indexer (avec sélection multiple)
- Configuration des dossiers exclus
- Paramètres d'indexation des pièces jointes
- Taille maximale des emails
- Boutons d'actions : Indexer tous, Indexer les modifiés, Vider l'index
- Statistiques d'indexation (nombre d'emails indexés, dernière indexation)

#### Onglet "RAG"
- Sélection du type de LLM (API Externe ou Local)
- **Configuration API Mistral** :
  - Endpoint
  - Clé API
  - Endpoint Embeddings
  - Modèle
- **Configuration Ollama** :
  - URL du serveur
  - Modèle
  - Bouton de vérification du statut
- Paramètres RAG avancés :
  - Top K (nombre de résultats)
  - Température

#### Onglet "Avancé"
- Taille des chunks
- Recouvrement des chunks
- Activation des logs de débogage
- Export/Import de la configuration
- Réinitialisation de la configuration

### 3. Mise à jour de la configuration par défaut

**Fichier modifié :** `src/config/defaultConfig.js`

Nouveaux paramètres ajoutés :
- `chunkSize` : 512 (taille des chunks en tokens)
- `chunkOverlap` : 100 (recouvrement des chunks en tokens)
- `topK` : 5 (nombre de résultats à retourner)
- `temperature` : 0.7 (température pour la génération)
- `embeddingEndpoint` : Endpoint pour les embeddings Mistral
- `model` : Modèle par défaut pour l'API
- `debug.enableDebugLogs` : Activation des logs de débogage

### 4. Mise à jour de la documentation

**Fichier modifié :** `README.md`

Ajouts majeurs :
- Section **"Accès à la Configuration"** expliquant les deux méthodes :
  - Via la barre latérale
  - Via les options de l'extension (méthode recommandée)
- Instructions détaillées pour chaque méthode
- Explications sur comment accéder aux options dans Thunderbird
- Documentation complète de tous les paramètres disponibles
- Exemples d'utilisation pour chaque type de LLM

### 5. Tests unitaires

**Nouveau fichier :** `tests/unit/config.test.js`

Tests ajoutés pour valider :
- La structure de la configuration par défaut
- Les valeurs par défaut de chaque paramètre
- La fonction `getDefaultConfig()`
- La validation des types de données

## Comment accéder à la configuration

### Méthode 1 : Via les options de l'extension (recommandé)

1. Cliquez sur le menu Thunderbird (☰)
2. Sélectionnez **"Add-ons et thèmes"**
3. Trouvez l'extension **"RAG Search"** dans la liste
4. Cliquez sur les **trois points (⋮)** à côté de l'extension
5. Sélectionnez **"Options"** ou **"Préférences"**

*OU*

- Faites un clic droit sur l'icône de l'extension dans la barre d'outils
- Sélectionnez **"Options"** dans le menu contextuel

### Méthode 2 : Via la barre latérale

1. Cliquez sur l'icône de l'extension dans la barre latérale de Thunderbird
2. Allez dans l'onglet **"Configuration"**
3. Configurez les paramètres de base
4. Cliquez sur **"Sauvegarder la configuration"**

## Fonctionnalités de la page des options

### Export/Import de la configuration

- **Exporter** : Télécharge un fichier JSON avec tous vos paramètres
- **Importer** : Charge une configuration précédemment exportée
- **Réinitialiser** : Remet tous les paramètres aux valeurs par défaut

### Vérification du statut Ollama

- Bouton **"Vérifier le statut"** pour tester la connexion au serveur Ollama
- Affiche un indicateur visuel (✓ ou ✗) du statut

### Statistiques d'indexation

- Nombre d'emails indexés
- Date de la dernière indexation
- Actions rapides d'indexation

## Compatibilité

- **Version de Thunderbird** : 102.0 ou supérieure (inchangée)
- **Nouvelle version de l'extension** : 1.1.0
- **Configuration** : Rétrocompatible avec les anciennes configurations

## Migration

Les utilisateurs existants n'ont **aucune action à effectuer** :
- Leur configuration actuelle sera automatiquement chargée
- Les nouveaux paramètres auront leurs valeurs par défaut
- La configuration est stockée dans `messenger.storage.local` comme avant

## Fichiers modifiés

1. `manifest.json` - Ajout de `options_ui` et mise à jour de la version
2. `README.md` - Documentation complète sur la configuration
3. `src/config/defaultConfig.js` - Ajout de nouveaux paramètres par défaut

## Fichiers ajoutés

1. `src/modules/ui/options.html`
2. `src/modules/ui/options.css`
3. `src/modules/ui/options.js`
4. `tests/unit/config.test.js`

## Version

- **Version précédente** : 1.0.0
- **Nouvelle version** : 1.1.0
