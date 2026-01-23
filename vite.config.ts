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
          // Bundle all node_modules together to avoid chunk loading issues
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },

    // Increase chunk size warning limit for Electron app (bundle size less critical than web)
    chunkSizeWarningLimit: 2000,
  },

  esbuild: {
    // Suppress CSS warnings during minification
    legalComments: 'none',
    logOverride: {
      'css-syntax-error': 'silent',
    },
  },
});