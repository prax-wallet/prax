import { vi } from 'vitest';
import { storage } from '@repo/mock-chrome';

vi.stubGlobal('chrome', { storage });
