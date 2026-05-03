import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: {
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'svelte/index': resolve(__dirname, 'src/svelte/index.ts'),
        'svelte/instruments/index': resolve(__dirname, 'src/svelte/instruments/index.ts'),
        'data/index': resolve(__dirname, 'src/data/index.ts'),
      },
      formats: ['es'],
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['svelte', /^svelte\//],
    },
  },
});
