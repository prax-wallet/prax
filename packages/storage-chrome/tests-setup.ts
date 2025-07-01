import { vi } from 'vitest';
import { storage, runtime } from '@repo/mock-chrome';
import 'navigator.locks';

vi.stubGlobal('chrome', { storage, runtime });

vi.stubGlobal('serviceWorker', true);
