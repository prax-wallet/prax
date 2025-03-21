import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
    expect(state.request).toBeUndefined();
    expect(state.response).toBeUndefined();
  });

  describe('acceptRequest()', () => {
    test('accepts a request and sets state correctly', () => {
      const origin = 'https://example.com';
      const favIconUrl = 'https://example.com/favicon.ico';
      const title = 'Example Site';
      const lastRequest = Date.now();

      const requestPromise = useStore
        .getState()
        .originApproval.acceptRequest({ origin, favIconUrl, title, lastRequest });

      // Shouldn't resolve yet
      expect(requestPromise).not.toBeUndefined();

      // Check state was updated
      const state = useStore.getState().originApproval;
      expect(state.responder).not.toBeUndefined();
      expect(state.request).toEqual({ origin, favIconUrl, title, lastRequest });
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
      ).toThrow('Another origin approval is still pending');
    });
  });

  describe('setChoice()', () => {
    test('sets choice correctly', () => {
      // First we need to accept a request
      void useStore.getState().originApproval.acceptRequest({
        origin: 'https://example.com',
      });

      useStore.getState().originApproval.setChoice(UserChoice.Approved);
      expect(useStore.getState().originApproval.response?.choice).toBe(UserChoice.Approved);

      useStore.getState().originApproval.setChoice(UserChoice.Denied);
      expect(useStore.getState().originApproval.response?.choice).toBe(UserChoice.Denied);
    });
  });

  describe('sendResponse()', () => {
    test('sends response and resets state', async () => {
      const origin = 'https://example.com';

      // Setup - accept a request and set choice
      const response = useStore.getState().originApproval.acceptRequest({
        origin,
      });

      // Set the required data
      useStore.getState().originApproval.setChoice(UserChoice.Approved);

      // Send response
      useStore.getState().originApproval.sendResponse();

      // Verify the response resolves properly
      await response;

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.request).toBeUndefined();
      expect(state.response).toBeUndefined();
    });

    test('throws if no responder', () => {
      // Mock console.error to prevent error output in test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => useStore.getState().originApproval.sendResponse()).toThrow(
        'No origin approval is pending',
      );

      consoleErrorSpy.mockRestore();
    });

    test('rejects if missing response data', () => {
      // Setup - accept a request but don't set choice
      void useStore.getState().originApproval.acceptRequest({
        origin: 'https://example.com',
      });

      // Send response without setting choice
      expect(() => useStore.getState().originApproval.sendResponse()).toThrow(
        'Missing origin approval response',
      );

      // State should be reset
      const state = useStore.getState().originApproval;
      expect(state.responder).toBeUndefined();
      expect(state.request).toBeUndefined();
      expect(state.response).toBeUndefined();
    });
  });
});
