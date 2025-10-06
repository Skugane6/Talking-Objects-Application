import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Allow access from network devices (test on mobile)
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'google-ai': ['@google/generative-ai']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@google/generative-ai']
  }
});