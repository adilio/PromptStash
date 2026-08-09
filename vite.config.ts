import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    // tests/rules/* needs the Firestore emulator and a node environment.
    // `npm run test:rules` runs those; this run stays offline.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
