import { vi } from 'vitest';
import { storage } from '@repo/mock-chrome';
import 'navigator.locks';

vi.stubGlobal('chrome', { storage, runtime: { id: 'test-extension-id' } });
