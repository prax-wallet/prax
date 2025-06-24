import { defineConfig } from 'vitest/config';

const praxId = 'thisisnotarealextensionid';

export default defineConfig({
  define: {
    PRAX: JSON.stringify(praxId),
    PRAX_ORIGIN: JSON.stringify(`chrome-extension://${praxId}/`),
  },
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
