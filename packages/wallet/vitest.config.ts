import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    chaiConfig: { truncateThreshold: 0 },
    poolOptions: {
      threads: {
        execArgv: ['--experimental-wasm-modules'],
      },
    },
    setupFiles: ['./tests-setup.ts'],
    exclude: ['node_modules', 'ledger-penumbra'],
  },
});
