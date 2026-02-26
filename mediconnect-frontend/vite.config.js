import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],

  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Firebase
            if (id.includes('/firebase/') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }

            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // React and React-dependent libraries
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('react-router') ||
              id.includes('/scheduler/') ||
              id.includes('framer-motion') ||
              id.includes('zustand') ||
              id.includes('@tanstack') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('@remix-run')
            ) {
              return 'vendor-react';
            }

            // Standalone utilities
            if (id.includes('date-fns')) {
              return 'vendor-utils';
            }

            if (id.includes('zod')) {
              return 'vendor-utils';
            }

            if (id.includes('axios')) {
              return 'vendor-utils';
            }

            return 'vendor-misc';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  resolve: {
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react',
    },
  },
});