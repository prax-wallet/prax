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

  beforeEach(() => {
    localMock.clear();
    sessionMock.clear();
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
  });

  test('initial state is empty', () => {
    const state = useStore.getState().originApproval;
    expect(state.responder).toBeUndefined();
    expect(state.favIconUrl).toBeUndefined();
    expect(state.title).toBeUndefined();
    expect(state.requestOrigin).toBeUndefined();
    expect(state.choice).toBeUndefined();
    expect(state.lastRequest).toBeUndefined();
  });

  describe('acceptRequest()', () => {
    test('accepts a request and sets state correctly', () => {
      const origin = 'https://example.com';
      const favIconUrl = 'https://example.com/favicon.ico';
      const title = 'Example Site';
      const lastRequest = Date.now();

      void useStore.getState().originApproval.acceptRequest({
        origin,
        favIconUrl,
        title,
        lastRequest,
      });

      // Check state was updated
      const state = useStore.getState().originApproval;
      expect(state.responder).not.toBeUndefined();
      expect(state.favIconUrl).toBe(favIconUrl);
      expect(state.title).toBe(title);
      expect(state.requestOrigin).toBe(origin);
      expect(state.lastRequest?.getTime()).toBe(lastRequest);
    });

    test('does not set title if it is just a URL under origin', () => {
      const origin = 'https://example.com';

      void useStore.getState().originApproval.acceptRequest({
        origin,
        title: new URL('/some/path.html', origin).href,
      });

      // Title should be undefined since it starts with the origin
      expect(useStore.getState().originApproval.title).toBeUndefined();
    });

    test('throws if another request is pending', () => {
      // First request
      void useStore.getState().originApproval.acceptRequest({
        origin: 'https://example.com',
      });

      // Second request should throw
      expect(() =>
        useStore.getState().originApproval.acceptRequest({
          origin: 'https://another.com',
        }),
      ).toThrow('Another request is still pending');
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
      const origin = 'https://example.com';
      const date = 1234;
      vi.setSystemTime(date);

      // Setup - accept a request
      const response = useStore.getState().originApproval.acceptRequest({
        origin,
      });

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
      expect(state.favIconUrl).toBeUndefined();
      expect(state.title).toBeUndefined();
      expect(state.requestOrigin).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });

    test('rejects if missing response data', async () => {
      // Setup - accept a request but don't set choice
      const response = useStore.getState().originApproval.acceptRequest({
        origin: 'https://example.com',
      });

      // Should reject when sending response without setting choice
      useStore.getState().originApproval.sendResponse();
      await expect(response).rejects.toThrow('Missing response data');

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
    });
  });
});
