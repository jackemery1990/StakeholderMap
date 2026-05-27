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
  },
});
