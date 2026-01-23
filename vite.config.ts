import { defineConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        // 👇 this Vite config is only for the *main* process bundle
        vite: {
          build: {
            rollupOptions: {
              external: ['keytar'],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        // no keytar here – preload must not import it anyway
      },
      renderer:
        process.env.NODE_ENV === 'test'
          ? undefined
          : {},
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for node_modules
          if (id.includes('node_modules')) {
            // Mantine UI library chunk
            if (id.includes('@mantine/')) {
              return 'mantine';
            }

            // TipTap editor chunk
            if (id.includes('@tiptap/')) {
              return 'editor';
            }

            // React ecosystem (separate from other vendors for caching)
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }

            // Zustand state management
            if (id.includes('zustand')) {
              return 'state';
            }

            // Zod validation library
            if (id.includes('zod')) {
              return 'validation';
            }

            // Remaining vendor dependencies
            return 'vendor';
          }

          // Separate chunks for heavy application modules
          if (id.includes('src/models/story')) {
            return 'models-story';
          }

          if (id.includes('src/models/entities')) {
            return 'models-entities';
          }

          if (id.includes('src/api/client')) {
            return 'api-client';
          }

          if (id.includes('src/helpers/entityProjectionUtils')) {
            return 'entity-utils';
          }
        },
      },
    },

    // Increase chunk size warning limit for Electron app (bundle size less critical than web)
    chunkSizeWarningLimit: 1000,
  },

  esbuild: {
    // Suppress CSS warnings during minification
    legalComments: 'none',
    logOverride: {
      'css-syntax-error': 'silent',
    },
  },
});