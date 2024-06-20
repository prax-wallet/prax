import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveOrigin } from './approve-origin';
import { localExtStorage } from './storage/local';

// Mocks
vi.mock('./storage/local', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('./popup', () => ({
  popup: vi.fn(),
}));

const mockTab = {
  index: 2,
  pinned: false,
  highlighted: true,
  windowId: 1,
  active: true,
  id: 123456,
  incognito: false,
  selected: false,
  discarded: false,
  autoDiscardable: true,
  groupId: -1,
};

describe('originHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('approveOrigin', () => {
    it('throws an error if the sender origin is not supported', async () => {
      const messageSender = { origin: 'http://insecure.com' };
      await expect(approveOrigin(messageSender)).rejects.toThrow('Unsupported sender');
    });

    it('returns the previously approved choice if one exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      localExtStorage.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: 'Approved' }]),
      );

      const messageSender = {
        origin: 'https://example.com',
        tab: mockTab,
      };
      const choice = await approveOrigin(messageSender);
      expect(choice).toBe('Approved');
    });

    // More tests based on different scenarios...
  });
});
