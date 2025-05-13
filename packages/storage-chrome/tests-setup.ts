import { vi } from 'vitest';

const mockChromeStorage = {
  onChanged: {
    addListener: vi.fn(),
  },
  local: {
    set: vi.fn(),
    get: vi.fn().mockReturnValue({ wallets: [] }),
    getBytesInUse: vi.fn().mockReturnValue(0),
    remove: vi.fn(),
  },
  session: {
    set: vi.fn(),
    get: vi.fn().mockReturnValue({}),
    remove: vi.fn(),
    getBytesInUse: vi.fn().mockReturnValue(0),
  },
};

vi.stubGlobal('chrome', { storage: mockChromeStorage });
