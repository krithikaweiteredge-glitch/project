import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The IVHM live server (python -m ivhm.live.server) runs on :8000. In development the site talks to it
// through this proxy, so the browser sees one origin. Change IVHM_API to point at another server.
const IVHM = process.env.IVHM_API || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': { target: IVHM, changeOrigin: true }, '/ws': { target: IVHM.replace(/^http/, 'ws'), ws: true } },
  },
});
