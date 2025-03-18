import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveSender } from './approve';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { OriginRecord } from '../storage/types';

const mockLocalStorage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('../storage/local', () => ({ localExtStorage: mockLocalStorage }));

const mockPopup = vi.hoisted(() => vi.fn());
vi.mock('../popup', () => ({
  popup: mockPopup,
}));

const mockTab = {
  favIconUrl: 'mock://doesntmatter.example.com/mock.ico',
  title: 'Mock Tab Title',
} as chrome.tabs.Tab;

describe('origin approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('approveSender', () => {
    it('prompts and stores choice for a new origin', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };

      const newOriginRecord = {
        choice: UserChoice.Approved,
        origin: 'mock://unknown.example.com',
      } satisfies Partial<OriginRecord>;

      mockPopup.mockResolvedValue({ ApproveOrigin: UserChoice.Approved });

      const choice = await approveSender(messageSender);
      expect(mockLocalStorage.set).toHaveBeenCalledWith('knownSites', [
        expect.objectContaining(newOriginRecord),
      ]);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('returns stored choice', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'mock://ignored.example.com', choice: UserChoice.Ignored }]),
      );
      const messageSender = { origin: 'mock://ignored.example.com', tab: mockTab };

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Ignored);
    });

    it('throws if multiple choice records exist for one origin', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([
          { origin: 'mock://duplicate.example.com', choice: UserChoice.Approved },
          { origin: 'mock://duplicate.example.com', choice: UserChoice.Denied },
        ]),
      );

      const messageSender = { origin: 'mock://duplicate.example.com', tab: mockTab };
      await expect(approveSender(messageSender)).rejects.toThrow(
        'There are multiple records for origin',
      );
    });

    it('returns denied choice if the popup is closed without a choice', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      mockPopup.mockResolvedValue(undefined);

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('returns denied choice if the popup is denied', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      mockPopup.mockResolvedValue({ ApproveOrigin: UserChoice.Denied });

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('can update a choice from denied to approved', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'mock://upsertable.example.com', choice: UserChoice.Denied }]),
      );
      const messageSender = { origin: 'mock://upsertable.example.com', tab: mockTab };

      const newOriginRecord = {
        choice: UserChoice.Approved,
        origin: 'mock://upsertable.example.com',
      } satisfies Partial<OriginRecord>;

      mockPopup.mockResolvedValue({ ApproveOrigin: UserChoice.Approved });

      const choice = await approveSender(messageSender);
      expect(mockLocalStorage.set).toHaveBeenCalledWith('knownSites', [
        expect.objectContaining(newOriginRecord),
      ]);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('calls popup with the correct parameters', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'mock://popuptest.example.com', tab: mockTab };
      mockPopup.mockResolvedValue({ ApproveOrigin: UserChoice.Approved });

      await approveSender(messageSender);

      expect(mockPopup).toHaveBeenCalledWith({
        ApproveOrigin: {
          origin: 'mock://popuptest.example.com',
          favIconUrl: mockTab.favIconUrl,
          title: mockTab.title,
          lastRequest: undefined,
        },
      });
    });

    it('persists known sites when a new site is added', async () => {
      const existingOriginRecord = {
        choice: UserChoice.Approved,
        date: 456,
        origin: 'mock://known.example.com',
      } satisfies OriginRecord;
      mockLocalStorage.get.mockReturnValue(Promise.resolve([existingOriginRecord]));

      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      const newOriginRecord = {
        choice: UserChoice.Approved,
        origin: 'mock://unknown.example.com',
      } satisfies Partial<OriginRecord>;
      mockPopup.mockResolvedValue({ ApproveOrigin: UserChoice.Approved });

      await approveSender(messageSender);

      expect(mockLocalStorage.set).toHaveBeenCalledWith('knownSites', [
        existingOriginRecord,
        expect.objectContaining(newOriginRecord),
      ]);
    });
  });
});
