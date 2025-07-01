import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveSender } from './approve';
import { OriginRecord, UserChoice } from '@repo/storage-chrome/records';
import { PopupType } from '../message/popup';
import { localExtStorage } from '@repo/storage-chrome/local';

const mockPopup = vi.hoisted(() => vi.fn());
vi.mock('../popup', () => ({
  popup: mockPopup,
}));

const mockTab = {
  favIconUrl: 'mock://doesntmatter.example.com/mock.ico',
  title: 'Mock Tab Title',
} as chrome.tabs.Tab;

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;

describe('origin approvals', () => {
  beforeEach(() => {
    localMock.clear();
    vi.clearAllMocks();
  });

  describe('approveSender', () => {
    it('prompts and stores choice for a new origin', async () => {
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };

      const newOriginRecord: OriginRecord = {
        choice: UserChoice.Approved,
        date: 123,
        origin: 'mock://unknown.example.com',
      };

      mockPopup.mockResolvedValue(newOriginRecord);

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Approved);

      await expect(localExtStorage.get('knownSites')).resolves.toContain(newOriginRecord);
    });

    it('returns stored choice', async () => {
      await localExtStorage.set('knownSites', [
        { origin: 'mock://ignored.example.com', choice: UserChoice.Ignored, date: 123 },
      ]);
      const messageSender = { origin: 'mock://ignored.example.com', tab: mockTab };

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Ignored);
    });

    it('throws if multiple choice records exist for one origin', async () => {
      await localExtStorage.set('knownSites', [
        { origin: 'mock://duplicate.example.com', choice: UserChoice.Approved, date: 123 },
        { origin: 'mock://duplicate.example.com', choice: UserChoice.Denied, date: 123 },
      ]);

      const messageSender = { origin: 'mock://duplicate.example.com', tab: mockTab };
      await expect(approveSender(messageSender)).rejects.toThrow(
        'There are multiple records for origin',
      );
    });

    it('returns denied choice if the popup is closed without a choice', async () => {
      await localExtStorage.set('knownSites', []);
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      mockPopup.mockResolvedValue(undefined);

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('returns denied choice if the popup is denied', async () => {
      await localExtStorage.set('knownSites', []);
      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Denied,
        date: 123,
        origin: 'mock://unknown.example.com',
      } satisfies OriginRecord);

      const choice = await approveSender(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('can update a choice from denied to approved', async () => {
      await localExtStorage.set('knownSites', [
        { origin: 'mock://upsertable.example.com', choice: UserChoice.Denied, date: 123 },
      ]);
      const messageSender = { origin: 'mock://upsertable.example.com', tab: mockTab };

      const newOriginRecord = {
        choice: UserChoice.Approved,
        date: 123,
        origin: 'mock://upsertable.example.com',
      } satisfies OriginRecord;

      mockPopup.mockResolvedValue(newOriginRecord);

      const choice = await approveSender(messageSender);
      await expect(localExtStorage.get('knownSites')).resolves.toStrictEqual([newOriginRecord]);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('calls popup with the correct parameters', async () => {
      await localExtStorage.set('knownSites', []);
      const messageSender = { origin: 'mock://popuptest.example.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Approved,
        date: 123,
        origin: 'mock://popuptest.example.com',
      } satisfies OriginRecord);

      await approveSender(messageSender);

      expect(mockPopup).toHaveBeenCalledWith(PopupType.OriginApproval, {
        origin: 'mock://popuptest.example.com',
        favIconUrl: mockTab.favIconUrl,
        title: mockTab.title,
        lastRequest: undefined,
      });
    });

    it('persists known sites when a new site is added', async () => {
      const existingOriginRecord = {
        choice: UserChoice.Approved,
        date: 456,
        origin: 'mock://known.example.com',
      } satisfies OriginRecord;
      await localExtStorage.set('knownSites', [existingOriginRecord]);

      const messageSender = { origin: 'mock://unknown.example.com', tab: mockTab };
      const newOriginRecord = {
        choice: UserChoice.Approved,
        date: 123,
        origin: 'mock://unknown.example.com',
      } satisfies OriginRecord;
      mockPopup.mockResolvedValue(newOriginRecord);

      await approveSender(messageSender);

      await expect(localExtStorage.get('knownSites')).resolves.toStrictEqual([
        existingOriginRecord,
        newOriginRecord,
      ]);
    });
  });
});
