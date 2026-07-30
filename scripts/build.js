#!/usr/bin/env node

/**
 * Script de build pour l'extension Thunderbird RAG Search
 * Bundle les scripts ES6 avec esbuild et copie les assets
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Dossiers
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const MODULES_UI_DIR = path.join(SRC_DIR, 'modules', 'ui');

// Fichiers à copier directement (sans bundling)
const COPY_FILES = [
  { src: path.join(MODULES_UI_DIR, 'sidebar.html'), dest: path.join(DIST_DIR, 'sidebar.html') },
  { src: path.join(MODULES_UI_DIR, 'options.html'), dest: path.join(DIST_DIR, 'options.html') },
  { src: path.join(MODULES_UI_DIR, 'sidebar.css'), dest: path.join(DIST_DIR, 'sidebar.css') },
  { src: path.join(MODULES_UI_DIR, 'options.css'), dest: path.join(DIST_DIR, 'options.css') },
];

// Scripts à bundler
const BUNDLE_SCRIPTS = [
  { entry: path.join(SRC_DIR, 'background.js'), out: path.join(DIST_DIR, 'background.js') },
  { entry: path.join(SRC_DIR, 'content.js'), out: path.join(DIST_DIR, 'content.js') },
  { entry: path.join(MODULES_UI_DIR, 'sidebar.js'), out: path.join(DIST_DIR, 'sidebar.js') },
  { entry: path.join(MODULES_UI_DIR, 'options.js'), out: path.join(DIST_DIR, 'options.js') },
];

// Configuration esbuild commune
const ESBUILD_CONFIG = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};

/**
 * Copie un fichier
 */
async function copyFile(src, dest) {
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    console.log(`\u2713 Copied: ${path.relative(PROJECT_ROOT, src)} \u2192 ${path.relative(PROJECT_ROOT, dest)}`);
  } catch (error) {
    console.error(`\u2717 Failed to copy ${src}:`, error.message);
    throw error;
  }
}

/**
 * Bundle un script avec esbuild
 */
async function bundleScript(entry, out) {
  try {
    await esbuild.build({
      ...ESBUILD_CONFIG,
      entryPoints: [entry],
      outfile: out,
    });
    console.log(`\u2713 Bundled: ${path.relative(PROJECT_ROOT, entry)} \u2192 ${path.relative(PROJECT_ROOT, out)}`);
  } catch (error) {
    console.error(`\u2717 Failed to bundle ${entry}:`, error.message);
    throw error;
  }
}

/**
 * Nettoie le dossier de destination
 */
async function cleanDist() {
  try {
    await fs.rm(DIST_DIR, { recursive: true, force: true });
    await fs.mkdir(DIST_DIR, { recursive: true });
    console.log(`\u2713 Cleaned: ${path.relative(PROJECT_ROOT, DIST_DIR)}`);
  } catch (error) {
    console.error(`\u2717 Failed to clean ${DIST_DIR}:`, error.message);
    throw error;
  }
}

/**
 * Build complet
 */
async function build() {
  console.log('Starting build...\n');

  try {
    // Nettoyer le dossier dist
    await cleanDist();

    // Copier les fichiers statiques
    console.log('\nCopying static files...');
    await Promise.all(COPY_FILES.map(({ src, dest }) => copyFile(src, dest)));

    // Bundler les scripts
    console.log('\nBundling scripts with esbuild...');
    await Promise.all(BUNDLE_SCRIPTS.map(({ entry, out }) => bundleScript(entry, out)));

    console.log('\n\u2705 Build completed successfully!');
    console.log(`Output directory: ${path.relative(PROJECT_ROOT, DIST_DIR)}`);
  } catch (error) {
    console.error('\n\u274c Build failed:', error);
    process.exit(1);
  }
}

// Ex\u00e9cuter le build
build();
