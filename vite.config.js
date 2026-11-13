import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    // Keep the bundle readable and deterministic for the test harness.
    sourcemap: false,
  },
});
