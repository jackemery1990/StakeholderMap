import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single, non-monorepo project: the frontend source lives in ./client.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 and allow Replit's dynamic *.replit.dev proxy host
    // so the dev server is reachable from the Replit webview.
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Dev only: forward /api/* to the Express API so the browser makes
      // same-origin requests (no CORS, works through the *.replit.dev proxy).
      // The /api prefix is preserved on the way through — the server mounts
      // its routes under /api — so no path rewrite is needed.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
