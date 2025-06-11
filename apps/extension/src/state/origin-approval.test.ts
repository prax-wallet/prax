import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { vi, beforeEach, describe, expect, test } from 'vitest';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { UserChoice } from '@repo/storage-chrome/records';

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

describe('Origin Approval Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  const mockTab = ({
    title,
    favIconUrl,
  }: {
    title?: string;
    favIconUrl?: string;
  }): chrome.tabs.Tab => ({
    title,
    favIconUrl,
    index: 0,
    pinned: false,
    windowId: 0,
    incognito: false,
    selected: true,
    discarded: false,
    groupId: 0,
    active: true,
    audible: false,
    autoDiscardable: false,
    height: 0,
    highlighted: false,
    id: 0,
  });

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  test('initial state is empty', () => {
    const state = useStore.getState().originApproval;
    expect(state.responder).toBeUndefined();
    expect(state.sender).toBeUndefined();
    expect(state.choice).toBeUndefined();
    expect(state.lastRequest).toBeUndefined();
  });

  describe('acceptRequest()', () => {
    test('accepts a request and sets state correctly', () => {
      const mockSender = {
        origin: 'https://example.com',
        tab: mockTab({
          favIconUrl: 'https://example.com/favicon.ico',
          title: 'Example Site',
        }),
      };
      const lastRequest = Date.now();

      void useStore.getState().originApproval.acceptRequest({ lastRequest }, mockSender);

      // Check state was updated
      const state = useStore.getState().originApproval;
      expect(state.responder).not.toBeUndefined();
      expect(state.sender).toBe(mockSender);
      expect(state.lastRequest?.getTime()).toBe(lastRequest);
    });

    test('throws if another request is pending', () => {
      const mockSender = {
        origin: 'https://example.com',
        tab: mockTab({ title: 'Example Site' }),
      };

      // First request
      void useStore.getState().originApproval.acceptRequest({}, mockSender);

      // Second request should throw
      expect(() => useStore.getState().originApproval.acceptRequest({}, mockSender)).toThrow(
        'Another request is still pending',
      );
    });
  });

  describe('setChoice()', () => {
    test('sets choice correctly', () => {
      useStore.getState().originApproval.setChoice(UserChoice.Approved);
      expect(useStore.getState().originApproval.choice).toBe(UserChoice.Approved);

      useStore.getState().originApproval.setChoice(UserChoice.Denied);
      expect(useStore.getState().originApproval.choice).toBe(UserChoice.Denied);
    });
  });

  describe('sendResponse()', () => {
    test('throws if no request was accepted', () => {
      expect(() => useStore.getState().originApproval.sendResponse()).toThrow('No responder');
    });

    test('sends response and resets state', async () => {
      const mockSender = {
        origin: 'https://example.com',
        tab: mockTab({ title: 'Example Site' }),
      };
      const date = 1234;
      vi.setSystemTime(date);

      // Setup - accept a request
      const response = useStore.getState().originApproval.acceptRequest({}, mockSender);

      // Set the choice
      useStore.getState().originApproval.setChoice(UserChoice.Approved);

      // Send response
      useStore.getState().originApproval.sendResponse();

      await expect(response).resolves.toMatchObject({
        origin: mockSender.origin,
        choice: UserChoice.Approved,
        date,
      });

      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.sender).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });

    test('rejects if missing response data', async () => {
      const mockSender = {
        origin: 'https://example.com',
        tab: mockTab({ title: 'Example Site' }),
      };
      // Setup - accept a request but don't set choice
      const response = useStore.getState().originApproval.acceptRequest({}, mockSender);

      // Should reject when sending response without setting choice
      useStore.getState().originApproval.sendResponse();
      await expect(response).rejects.toThrow('Missing response data');

      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.sender).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });
  });
});
