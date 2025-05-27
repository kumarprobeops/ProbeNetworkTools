import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // Existing API proxy (keep if your backend exposes /api routes on 5000)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Add proxy for /keys routes to your FastAPI backend on port 8000
      '/keys': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // (Optional) Uncomment/add below if you use more endpoints in FastAPI:
      // '/probe': { target: 'http://localhost:8000', changeOrigin: true },
      // '/history': { target: 'http://localhost:8000', changeOrigin: true },
      // '/metrics': { target: 'http://localhost:8000', changeOrigin: true },
    }
  },
});
