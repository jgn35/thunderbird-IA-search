/**
 * Configuration esbuild pour bundler les scripts de l'extension Thunderbird
 */

import esbuild from 'esbuild';

// Configuration commune pour tous les scripts
const commonConfig = {
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  minify: false,
};

// Configuration pour chaque script
const scripts = [
  {
    entryPoints: ['src/background.js'],
    outfile: 'dist/background.js',
  },
  {
    entryPoints: ['src/content.js'],
    outfile: 'dist/content.js',
  },
  {
    entryPoints: ['src/modules/ui/sidebar.js'],
    outfile: 'dist/sidebar.js',
  },
  {
    entryPoints: ['src/modules/ui/options.js'],
    outfile: 'dist/options.js',
  },
];

// Fonction pour builder tous les scripts
async function buildAll() {
  try {
    for (const script of scripts) {
      await esbuild.build({
        ...commonConfig,
        ...script,
      });
      console.log(`✓ Built: ${script.outfile}`);
    }
    console.log('All scripts built successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Fonction pour watcher les changements
async function watchAll() {
  const ctx = await esbuild.context({
    ...commonConfig,
    entryPoints: scripts.map(s => s.entryPoints[0]),
    outdir: 'dist',
    outExtension: { '.js': '.js' },
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

// Exporter pour utilisation avec la ligne de commande
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watchAll().catch(() => process.exit(1));
} else {
  buildAll().catch(() => process.exit(1));
}

export default { commonConfig, scripts };
