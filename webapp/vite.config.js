import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const root = resolve(__dirname, 'src/pages');
const outDir = resolve(__dirname, 'dist');

export default defineConfig({
  root,
  // the config file has to be named explicitly: vite's root is src/pages, and
  // that is where the plugin would look for it otherwise
  plugins: [svelte({ configFile: resolve(__dirname, 'svelte.config.js') })],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $theme: resolve(__dirname, 'src/theme'),
      $assets: resolve(__dirname, 'src/assets'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // SMUI ships its sass under node_modules; this is what lets
        // `@use '@material/...'` resolve from src/theme/_smui-theme.scss
        includePaths: [resolve(__dirname, 'node_modules')],
      },
    },
  },
  build: {
    outDir,
    assetsDir: 'static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
});
