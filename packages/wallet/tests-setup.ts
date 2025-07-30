/* eslint-disable no-var  -- test global */
import { runtime, storage } from '@repo/mock-chrome';
import Zemu from '@zondax/zemu';
import 'navigator.locks';
import path from 'node:path';
import { vi, afterAll } from 'vitest';

vi.stubGlobal('chrome', { storage, runtime });

vi.stubGlobal('serviceWorker', true);

const {
  LEDGER_APP = path.join(import.meta.dirname, 'ledger-penumbra', 'app', 'output', 'app_s2.elf'),
  LEDGER_MODEL = 'nanosp',
} = process.env;

vi.stubGlobal('__LEDGER_APP__', LEDGER_APP);
vi.stubGlobal('__LEDGER_MODEL__', LEDGER_MODEL);

await Zemu.stopAllEmuContainers();

await Zemu.checkAndPullImage().catch(() =>
  console.log('Failed to check/pull Docker image, continuing anyway'),
);

afterAll(async () => {
  await Zemu.stopAllEmuContainers();
});

declare global {
  var __LEDGER_APP__: typeof LEDGER_APP;
  var __LEDGER_MODEL__: typeof LEDGER_MODEL;
}
