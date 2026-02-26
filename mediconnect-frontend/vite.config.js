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
  
  // Add this to fix lucide-react issues
  optimizeDeps: {
    include: ['lucide-react'],
  },
  
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
            
            // ⚠️ IMPORTANT: Check lucide-react BEFORE react
            // Icons - must be checked before generic 'react' check
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            
            // React ecosystem (checked AFTER lucide-react)
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router')
            ) {
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
    // Suppress warnings for slightly larger chunks
    chunkSizeWarningLimit: 550,
    
    // Add this for better compatibility
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  // Add resolve alias for lucide-react
  resolve: {
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react',
    },
  },
});