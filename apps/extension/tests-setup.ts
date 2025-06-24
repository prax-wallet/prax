import { runtime, storage } from '@repo/mock-chrome';
import { vi } from 'vitest';
import 'navigator.locks';

vi.stubGlobal('chrome', { runtime, storage });
