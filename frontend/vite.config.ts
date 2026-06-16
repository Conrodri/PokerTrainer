import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep ALL node_modules in a single long-cached vendor chunk. Splitting
        // React into its own chunk apart from React-consuming libs broke prod
        // ("Cannot read properties of undefined (reading 'useState')") because a
        // sibling vendor chunk resolved React as undefined. One vendor chunk keeps
        // React co-located with every consumer; the lazy route/trainer chunks
        // (dynamic imports) are still split out automatically.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
});
