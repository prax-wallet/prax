import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    chaiConfig: { truncateThreshold: 0 },
    poolOptions: {
      threads: {
        execArgv: ['--experimental-wasm-modules'],
      },
    },
    setupFiles: ['./tests-setup.ts'],
    exclude: ['node_modules', 'ledger-penumbra'],
    env: {
      LEDGER_APP:
        process.env['LEDGER_APP'] ?? path.resolve('./ledger-penumbra/app/output/app_s2.elf'),
      LEDGER_MODEL: process.env['LEDGER_MODEL'] ?? 'nanosp',
      LEDGER_TIMEOUT: process.env['LEDGER_TIMEOUT'] ?? String(process.env['CI'] ? 90_000 : 60_000),
    },
  },
});
