import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        ouvertures: fileURLToPath(new URL('./ouvertures.html', import.meta.url)),
        lecons: fileURLToPath(new URL('./lecons.html', import.meta.url)),
      },
    },
  },
  plugins: [{
    name: 'local-chess-pieces',
    closeBundle() {
      cpSync(new URL('./pieces/', import.meta.url), new URL('./dist/pieces/', import.meta.url), { recursive: true });
      cpSync(new URL('./audio/', import.meta.url), new URL('./dist/audio/', import.meta.url), { recursive: true });
      cpSync(new URL('./boards/', import.meta.url), new URL('./dist/boards/', import.meta.url), { recursive: true });
    },
  }],
});
