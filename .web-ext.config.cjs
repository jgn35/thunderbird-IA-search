/**
 * Configuration pour web-ext
 * Utilise le tag git pour le nom du fichier XPI
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Récupérer le tag git actuel
function getGitTag() {
  try {
    // Essayer de récupérer le tag exact
    const tag = execSync('git describe --tags --exact-match', { 
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (tag) {
      return tag;
    }
    
    // Si pas de tag exact, essayer avec le dernier tag
    const lastTag = execSync('git describe --tags --abbrev=0', { 
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    if (lastTag) {
      return lastTag;
    }
  } catch (error) {
    // Ignorer l'erreur et utiliser la version par défaut
  }
  
  // Retourner une chaîne vide pour utiliser le nom par défaut
  return '';
}

// Récupérer la version du package.json
function getPackageVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
    );
    return packageJson.version || '1.0.0';
  } catch (error) {
    return '1.0.0';
  }
}

// Construire le nom du fichier XPI
function buildFilename() {
  const tag = getGitTag();
  const version = getPackageVersion();
  
  if (tag) {
    // Utiliser le tag git
    return `thunderbird-rag-search-${tag}.xpi`;
  }
  
  // Utiliser la version du package.json
  return `thunderbird-rag-search-v${version}.xpi`;
}

// Configuration pour web-ext
module.exports = {
  // Options de build
  build: {
    // Chemin de sortie
    overwriteDest: true,
  },
  
  // Options de packaging
  packaging: {
    // Nom du fichier XPI
    filename: buildFilename(),
  },
  
  // Options générales
  run: {
    // Port pour le serveur de développement
    port: 8080,
  },
};
