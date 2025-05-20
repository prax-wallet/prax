import { vi } from 'vitest';

export const runtime = {
  sendMessage: vi.fn(),
  connect: vi.fn().mockReturnValue({
    onMessage: {
      addListener: vi.fn(),
    },
    onDisconnect: {
      addListener: vi.fn(),
    },
  }),
};

export const storage = {
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
