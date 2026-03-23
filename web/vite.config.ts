import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    // Tell Vite where to find our monorepo packages.
    // Without this, `import { BlackjackGame } from '@blackjack/game-logic'`
    // would fail because Vite doesn't know where that package lives.
    alias: {
      '@blackjack/game-logic': path.resolve(__dirname, '../packages/game-logic/src/index.ts'),
      '@blackjack/shared': path.resolve(__dirname, '../packages/shared/src/index.ts'),
    },
  },

  server: {
    // Proxy all /room/* requests to the Cloudflare worker in development.
    // This avoids CORS issues and means we can use relative URLs like /room/new.
    proxy: {
      '/room': {
        target: 'http://localhost:8787',
        ws: true, // also proxy WebSocket upgrades
      },
    },
  },
});
