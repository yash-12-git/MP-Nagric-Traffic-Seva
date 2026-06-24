import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BACKEND_URL lets docker-compose point the proxy at the backend container
// (http://backend:3001); defaults to localhost for native dev.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Proxy /api to the backend so the browser talks to one origin.
    proxy: {
      '/api': { target: BACKEND_URL, changeOrigin: true },
    },
  },
});
