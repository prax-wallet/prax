import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveOrigin } from './approve-origin';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { OriginRecord } from '../storage/types';
import { PopupType } from '../message/popup';

const mockLocalStorage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));
vi.mock('./storage/local', () => ({ localExtStorage: mockLocalStorage }));

const mockPopup = vi.hoisted(() => vi.fn());
vi.mock('./popup', () => ({
  popup: mockPopup,
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
  favIconUrl: 'https://image.com/favicon.ico',
  title: 'Penumbra | xyz',
} satisfies chrome.tabs.Tab;

describe('originHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('approveOrigin', () => {
    it('throws an error if the sender origin is not supported', async () => {
      const messageSender = { origin: 'http://insecure.com' };
      await expect(approveOrigin(messageSender)).rejects.toThrow('Unsupported sender');
    });

    it('throws an error if the tab ID is missing', async () => {
      const messageSender = { origin: 'https://example.com' };
      await expect(approveOrigin(messageSender)).rejects.toThrow('Unsupported sender');
    });

    it('throws an error if a frame ID is present', async () => {
      const messageSender = { origin: 'https://example.com', tab: mockTab, frameId: 123 };
      await expect(approveOrigin(messageSender)).rejects.toThrow('Unsupported sender');
    });

    it('prompts user for approval if the origin is not known', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'https://newsite.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Approved,
        date: 123,
        origin: 'https://newsite.com',
      } satisfies OriginRecord);

      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('returns the stored choice if the origin is already known and approved', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Approved }]),
      );

      const messageSender = { origin: 'https://example.com', tab: mockTab };
      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('throws an error if multiple records exist for the same origin', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([
          { origin: 'https://example.com', choice: UserChoice.Approved },
          { origin: 'https://example.com', choice: UserChoice.Denied },
        ]),
      );

      const messageSender = { origin: 'https://example.com', tab: mockTab };
      await expect(approveOrigin(messageSender)).rejects.toThrow(
        'There are multiple records for origin: https://example.com',
      );
    });

    it('returns Denied if the user denies the request', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'https://newsite.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Denied,
        date: 123,
        origin: 'https://newsite.com',
      } satisfies OriginRecord);

      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('updates an existing record if the user changes their choice from denied to approve', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Denied }]),
      );
      const messageSender = { origin: 'https://example.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Approved,
        date: 123,
        origin: 'https://example.com',
      } satisfies OriginRecord);

      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('returns the previously approved choice if one exists', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Approved }]),
      );

      const messageSender = {
        origin: 'https://example.com',
        tab: mockTab,
      };
      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('correctly updates the persisted known sites after user interaction', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Denied }]),
      );
      const messageSender = { origin: 'https://example.com', tab: mockTab };
      const newOriginRecord = {
        choice: UserChoice.Approved,
        date: 123,
        origin: 'https://example.com',
      } satisfies OriginRecord;
      mockPopup.mockResolvedValue(newOriginRecord);

      await approveOrigin(messageSender);

      expect(mockLocalStorage.set).toHaveBeenCalledWith('knownSites', [newOriginRecord]);
    });

    it('returns the stored choice if the origin is already known and ignored', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Ignored }]),
      );

      const messageSender = { origin: 'https://example.com', tab: mockTab };
      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Ignored);
    });

    it('returns UserChoice.Denied if the user closes the popup without making a choice', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'https://newsite.com', tab: mockTab };
      mockPopup.mockResolvedValue(undefined);

      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Denied);
    });

    it('correctly handles trailing slashes in the origin', async () => {
      mockLocalStorage.get.mockReturnValue(
        Promise.resolve([{ origin: 'https://example.com', choice: UserChoice.Approved }]),
      );

      const messageSender = { origin: 'https://example.com/', tab: mockTab };
      const choice = await approveOrigin(messageSender);
      expect(choice).toBe(UserChoice.Approved);
    });

    it('shows the popup with the correct parameters', async () => {
      mockLocalStorage.get.mockReturnValue(Promise.resolve([]));
      const messageSender = { origin: 'https://newsite.com', tab: mockTab };
      mockPopup.mockResolvedValue({
        choice: UserChoice.Approved,
        date: 123,
        origin: 'https://newsite.com',
      } satisfies OriginRecord);

      await approveOrigin(messageSender);

      expect(mockPopup).toHaveBeenCalledWith({
        type: PopupType.OriginApproval,
        request: {
          origin: 'https://newsite.com',
          favIconUrl: mockTab.favIconUrl,
          title: mockTab.title,
          lastRequest: undefined,
        },
      });
    });

    it('correctly persists the known sites when a new site is added', async () => {
      const existingOriginRecord = {
        choice: UserChoice.Approved,
        date: 456,
        origin: 'https://existingsite.com',
      } satisfies OriginRecord;
      mockLocalStorage.get.mockReturnValue(Promise.resolve([existingOriginRecord]));

      const messageSender = { origin: 'https://newsite.com', tab: mockTab };
      const newOriginRecord = {
        choice: UserChoice.Approved,
        date: 123,
        origin: 'https://newsite.com',
      } satisfies OriginRecord;
      mockPopup.mockResolvedValue(newOriginRecord);

      await approveOrigin(messageSender);

      expect(mockLocalStorage.set).toHaveBeenCalledWith('knownSites', [
        existingOriginRecord,
        newOriginRecord,
      ]);
    });
  });
});
