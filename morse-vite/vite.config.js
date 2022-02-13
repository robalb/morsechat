import { resolve } from 'path';
import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';

const root = resolve(__dirname, 'src/pages')
const outDir = resolve(__dirname, 'dist')

// https://vitejs.dev/config/
export default defineConfig({
  root,
  plugins: [reactRefresh()],
  build: {
    outDir,
    assetsDir: 'static',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index-deprecated.html'),
        chat: resolve(root, 'chat', 'index-deprecated.html')
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
});
