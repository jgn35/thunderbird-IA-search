# Thunderbird RAG Search Extension

Extension Thunderbird pour l'indexation et la recherche RAG (Retrieval-Augmented Generation) avec ChromaDB et LLM (Mistral AI ou Ollama).

## 📌 À propos

Cette extension permet aux utilisateurs de :
- Indexer les emails des comptes et répertoires sélectionnés (le dossier **Spam** est exclu par défaut).
- Rechercher des informations spécifiques dans les emails via une interface dédiée.
- Générer des résumés ou des réponses basées sur le contenu des emails en utilisant le **RAG**.
- Choisir entre un **LLM local (Ollama)** ou une **API externe (Mistral AI)** pour le traitement.

## 🛠 Configuration Requise

- **Thunderbird** : Version 102.0 ou supérieure
- **Node.js** : Version 18 ou supérieure (pour le développement)
- **Yarn** : Gestionnaire de paquets recommandé

## 🚀 Installation

### Pour les développeurs

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/jgn35/thunderbird-IA-search.git
   cd thunderbird-IA-search
   ```

2. Installer les dépendances :
   ```bash
   yarn install
   ```

3. Charger l'extension dans Thunderbird :
   - Ouvrir Thunderbird
   - Aller dans `Menu → Add-ons et thèmes → Outils pour les développeurs`
   - Cliquer sur `Charger un module complémentaire temporaire`
   - Sélectionner le fichier `manifest.json` dans le dossier du projet

### Pour les utilisateurs finaux

*À venir : Package .xpi pour installation directe.*

## 📂 Structure du Projet

```
/thunderbird-rag-extension
├── src/
│   ├── modules/
│   │   ├── indexation/       # Module d'indexation (ChromaDB)
│   │   ├── recherche/        # Module de recherche (retrieval)
│   │   ├── generation/       # Module de génération (LLM)
│   │   └── ui/               # Interface utilisateur (barre latérale)
│   ├── config/               # Configuration
│   └── utils/                # Utilitaires (logs, helpers)
├── tests/                    # Tests unitaires et d'intégration
├── docs/                     # Documentation technique et utilisateur
├── manifest.json             # Configuration de l'extension
├── package.json              # Dépendances et scripts
└── README.md                 # Ce fichier
```

## 🔧 Configuration

### Configuration par défaut

L'extension utilise la configuration suivante par défaut :

- **Dossiers exclus** : `Spam`
- **Indexation des pièces jointes** : Désactivée
- **Limite de taille des emails** : 10 Mo
- **Type de LLM** : API externe (Mistral AI)

### Personnalisation

Pour modifier la configuration :
1. Ouvrir la barre latérale de l'extension dans Thunderbird.
2. Aller dans l'onglet `Configuration`.
3. Modifier les paramètres selon vos besoins.

## 📚 Documentation

- [Documentation Technique](docs/technical.md) : Architecture, modules, et détails d'implémentation.
- [Guide Utilisateur](docs/user_guide.md) : Installation, configuration, et utilisation.

## 🧪 Tests

Pour exécuter les tests :
```bash
# Tests unitaires
yarn test

# Tests avec couverture
yarn test:coverage

# Tests en mode surveillance
yarn test:watch
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre les étapes suivantes :

1. Forker le projet.
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/ma-fonctionnalité`).
3. Valider vos changements (`git commit -m 'Ajout de ma fonctionnalité'`).
4. Pousser vers la branche (`git push origin feature/ma-fonctionnalité`).
5. Ouvrir une Merge Request.

## 📜 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
