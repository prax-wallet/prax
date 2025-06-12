import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { vi, beforeEach, describe, expect, test } from 'vitest';
import { mockLocalExtStorage, mockSessionExtStorage } from '@repo/storage-chrome/mock';
import { UserChoice } from '@penumbra-zone/types/user-choice';

describe('Origin Approval Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  const mockTabInit: Omit<chrome.tabs.Tab, 'favIconUrl' | 'title'> = {
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
  };

  beforeEach(() => {
    useStore = create<AllSlices>()(initializeStore(mockSessionExtStorage(), mockLocalExtStorage()));
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
        tab: {
          ...mockTabInit,
          favIconUrl: 'https://example.com/favicon.ico',
          title: 'Example Site',
        },
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
        tab: { ...mockTabInit, title: 'Example Site' },
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
        tab: { ...mockTabInit, title: 'Example Site' },
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
        origin,
        choice: UserChoice.Approved,
        date,
      });

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.sender).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });

    test('rejects if missing response data', async () => {
      const mockSender = {
        origin: 'https://example.com',
        tab: { ...mockTabInit, title: 'Example Site' },
      };
      // Setup - accept a request but don't set choice
      const response = useStore.getState().originApproval.acceptRequest({}, mockSender);

      // Should reject when sending response without setting choice
      useStore.getState().originApproval.sendResponse();
      await expect(response).rejects.toThrow('Missing response data');

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
    });
  });
});
