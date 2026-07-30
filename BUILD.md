# Build Instructions - Thunderbird RAG Search Extension

## Prérequis

- Node.js 18+ 
- Yarn (recommandé) ou npm
- Thunderbird 102.0+

## Installation

```bash
# Cloner le dépôt
git clone https://github.com/jgn35/thunderbird-IA-search.git
cd thunderbird-IA-search

# Installer les dépendances
yarn install
# ou
npm install
```

## Build

### Build pour le développement

```bash
# Builder les scripts et copier les assets
yarn build:scripts

# ou pour un build complet (scripts + package web-ext)
yarn build
```

### Build en mode watch (développement)

```bash
# Surveiller les changements et rebuild automatiquement
yarn watch
```

## Structure du build

### Dossier `dist/`

Le build génère un dossier `dist/` contenant :

```
dist/
├── background.js      # Script de fond bundlé
├── content.js         # Script de contenu bundlé
├── sidebar.js        # Script de la sidebar bundlé
├── options.js        # Script des options bundlé
├── sidebar.html      # HTML de la sidebar (copié)
├── options.html      # HTML des options (copié)
└── sidebar.css       # CSS de la sidebar (copié)
```

### Bundling avec esbuild

L'extension utilise **esbuild** pour bundler les scripts ES6 :

- **Format** : ESM (ECMAScript Modules)
- **Plateforme** : Browser
- **Cible** : ES2020
- **Source maps** : Générées pour le débogage

## Charger l'extension dans Thunderbird

### Méthode 1 : Chargement temporaire (développement)

1. Builder les scripts :
   ```bash
   yarn build:scripts
   ```

2. Ouvrir Thunderbird

3. Aller dans : `Menu ▸ Add-ons et thèmes ▸ Outils pour les développeurs`

4. Cliquer sur `Charger un module complémentaire temporaire`

5. Sélectionner le fichier `manifest.json` dans le dossier racine du projet

### Méthode 2 : Build complet avec web-ext

```bash
# Builder l'extension complète
yarn build

# Le package sera généré dans web-ext-artifacts/
```

## Dépannage

### Erreur : "import declarations may only appear at top level of a module"

Cette erreur se produit si vous essayez de charger les scripts non-bundlés directement. 

**Solution** : Toujours utiliser les scripts bundlés dans le dossier `dist/`.

### Erreur : esbuild non trouvé

```bash
# Installer esbuild globalement
npm install -g esbuild

# ou localement
yarn add -D esbuild
```

### Vérifier le build

Après le build, vérifiez que :

1. Le dossier `dist/` existe
2. Tous les fichiers nécessaires sont présents
3. Le manifest.json pointe vers les fichiers dans `dist/`

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `yarn install` | Installe les dépendances |
| `yarn build:scripts` | Bundle les scripts ES6 |
| `yarn build` | Build complet (scripts + package) |
| `yarn watch` | Mode watch pour le développement |
| `yarn dev` | Lance l'extension avec web-ext |
| `yarn test` | Exécute les tests |

## Configuration du bundling

Le bundling est configuré dans :

- `package.json` - Scripts de build
- `scripts/build.js` - Script de build personnalisé
- `esbuild.config.js` - Configuration esbuild (optionnelle)

Pour modifier la configuration du bundling, éditez `scripts/build.js`.
