import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // Firebase - large, separate chunk
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            
            // State management
            if (id.includes('zustand') || id.includes('@tanstack/react-query')) {
              return 'vendor-state';
            }
            
            // UI/Animation
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            
            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            
            // Date utilities
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('hookform') || id.includes('zod')) {
              return 'vendor-forms';
            }
            
            // HTTP/API
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            
            // All other vendor modules
            return 'vendor-misc';
          }
        },
      },
    },
    // Optional: Suppress warnings for slightly larger chunks
    chunkSizeWarningLimit: 550,
  },
});