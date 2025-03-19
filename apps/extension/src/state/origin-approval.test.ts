import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { beforeEach, describe, expect, test } from 'vitest';
import { mockLocalExtStorage, mockSessionExtStorage } from '../storage/mock';
import { UserChoice } from '@penumbra-zone/types/user-choice';

describe('Origin Approval Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  beforeEach(() => {
    useStore = create<AllSlices>()(initializeStore(mockSessionExtStorage(), mockLocalExtStorage()));
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

      const requestPromise = useStore.getState().originApproval.acceptRequest({
        OriginApproval: { origin, favIconUrl, title, lastRequest },
      });

      // Shouldn't resolve yet
      expect(requestPromise).not.toBeUndefined();

      // Check state was updated
      const state = useStore.getState().originApproval;
      expect(state.responder).not.toBeUndefined();
      expect(state.favIconUrl).toBe(favIconUrl);
      expect(state.title).toBe(title);
      expect(state.requestOrigin).toBe(origin);
      expect(state.lastRequest?.getTime()).toBe(lastRequest);
    });

    test('does not set title if it starts with origin', () => {
      const origin = 'https://example.com';
      const title = 'https://example.com - Some Page';

      void useStore.getState().originApproval.acceptRequest({
        OriginApproval: { origin, title },
      });

      // Title should be undefined since it starts with the origin
      expect(useStore.getState().originApproval.title).toBeUndefined();
    });

    test('throws if another request is pending', () => {
      // First request
      void useStore.getState().originApproval.acceptRequest({
        OriginApproval: { origin: 'https://example.com' },
      });

      // Second request should throw
      expect(() =>
        useStore.getState().originApproval.acceptRequest({
          OriginApproval: { origin: 'https://another.com' },
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
    test('sends response and resets state', async () => {
      const origin = 'https://example.com';

      // Setup - accept a request and set choice
      const response = useStore.getState().originApproval.acceptRequest({
        OriginApproval: { origin },
      });

      // Set the required data
      useStore.getState().originApproval.setChoice(UserChoice.Approved);

      // Send response
      useStore.getState().originApproval.sendResponse();

      await expect(response).resolves.toHaveProperty('OriginApproval');

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.favIconUrl).toBeUndefined();
      expect(state.title).toBeUndefined();
      expect(state.requestOrigin).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });

    test('throws if no responder', () => {
      expect(() => useStore.getState().originApproval.sendResponse()).toThrow('No responder');
    });

    test('rejects if missing response data', async () => {
      // Setup - accept a request but don't set choice
      const response = useStore.getState().originApproval.acceptRequest({
        OriginApproval: { origin: 'https://example.com' },
      });

      useStore.getState().originApproval.sendResponse();

      // Send response without choice should throw
      await expect(response).rejects.toThrow('Missing response data');

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
    });
  });
});
