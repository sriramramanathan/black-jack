import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        // Point at our wrangler.toml — this gives the test environment
        // the same bindings, Durable Objects, and compatibility flags
        // as the actual deployed worker
        wrangler: { configPath: './wrangler.toml' },
        // Disable per-test storage isolation — we're not using DO storage yet
        // (storage persistence is planned for a later phase)
        isolatedStorage: false,
      },
    },
  },
});
