/* eslint-disable no-console -- test setup */
import { runtime, storage } from '@repo/mock-chrome';
import Zemu from '@zondax/zemu';
import 'navigator.locks';
import { vi, afterAll } from 'vitest';

vi.stubGlobal('chrome', { storage, runtime });

vi.stubGlobal('serviceWorker', true);

Zemu.stopAllEmuContainers();

await Zemu.checkAndPullImage().catch(() =>
  console.log('Failed to check/pull Docker image, continuing anyway'),
);

afterAll(() => Zemu.stopAllEmuContainers());
