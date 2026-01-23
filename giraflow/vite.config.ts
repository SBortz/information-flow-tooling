import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { ifLivePlugin } from './src/vite-plugin-if-live.ts';

export default defineConfig({
  plugins: [svelte(), ifLivePlugin()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
