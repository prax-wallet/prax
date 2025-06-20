import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    poolOptions: {
      threads: {
        execArgv: ['--experimental-wasm-modules'],
      },
    },
    setupFiles: ['./tests-setup.ts'],
  },
});
