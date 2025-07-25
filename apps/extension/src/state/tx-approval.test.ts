import { JsonObject } from '@bufbuild/protobuf';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { UserChoice } from '@repo/storage-chrome/records';
import { beforeEach, describe, expect, MockedFunction, test, vi } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { AllSlices, initializeStore } from '.';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

const localMock = (chrome.storage.local as unknown as { mock: Map<string, unknown> }).mock;
const sessionMock = (chrome.storage.session as unknown as { mock: Map<string, unknown> }).mock;

// Mock transaction view functions
vi.mock('@penumbra-zone/perspective/plan/view-transaction-plan', () => {
  const viewTransactionPlan: MockedFunction<
    typeof import('@penumbra-zone/perspective/plan/view-transaction-plan').viewTransactionPlan
  > = vi.fn((..._) => Promise.resolve(new TransactionView()));
  return Promise.resolve({ viewTransactionPlan });
});

// Mock viewClient methods
vi.mock('../clients', () => ({
  viewClient: {
    assetMetadataById: vi.fn().mockResolvedValue({ denomMetadata: null }),
    indexByAddress: vi.fn().mockResolvedValue({ addressIndex: '1' }),
  },
}));

vi.mock('@penumbra-zone/perspective/transaction/classify', () => ({
  classifyTransaction: vi.fn().mockReturnValue({ type: 'send' }),
}));

vi.mock('@penumbra-zone/perspective/translators/transaction-view', () => ({
  asPublicTransactionView: vi.fn().mockReturnValue(new TransactionView({})),
  asReceiverTransactionView: vi.fn().mockResolvedValue(new TransactionView({})),
}));

const bech32FVK =
  'penumbrafullviewingkey1vzfytwlvq067g2kz095vn7sgcft47hga40atrg5zu2crskm6tyyjysm28qg5nth2fqmdf5n0q530jreumjlsrcxjwtfv6zdmfpe5kqsa5lg09';

const wallet0 = {
  label: 'mock',
  id: 'mock',
  fullViewingKey: new FullViewingKey(fullViewingKeyFromBech32m(bech32FVK)).toJsonString(),
  custody: {
    encryptedSeedPhrase: {
      cipherText:
        'di37XH8dpSbuBN9gwGB6hgAJycWVqozf3UB6O3mKTtimp8DsC0ZZRNEaf1hNi2Eu2pu1dF1f+vHAnisk3W4mRggAVUNtO0gvD8jcM0RhzGVEZnUlZuRR1TtoQDFXzmo=',
      nonce: 'MUyDW2GHSeZYVF4f',
    },
  },
};

const pw = {
  _inner: {
    alg: 'A256GCM',
    ext: true,
    k: '2l2K1HKpGWaOriS58zwdDTwAMtMuczuUQc4IYzGxyhM',
    kty: 'oct',
    key_ops: ['encrypt', 'decrypt'],
  },
};

describe('Transaction Approval Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  let authorizeRequest: AuthorizeRequest;
  const waitForAuthorizeRequestSet = () =>
    vi.waitFor(() =>
      expect(useStore.getState().txApproval.authorizeRequest).toEqual(
        authorizeRequest.toJsonString(),
      ),
    );

  beforeEach(async () => {
    localMock.clear();
    sessionMock.clear();
    await localExtStorage.set('wallets', [wallet0]);
    await sessionExtStorage.set('passwordKey', pw);
    useStore = create<AllSlices>()(initializeStore(sessionExtStorage, localExtStorage));
    vi.clearAllMocks();

    authorizeRequest = new AuthorizeRequest({
      plan: new TransactionPlan(),
    });
  });

  test('initial state is empty', () => {
    const state = useStore.getState().txApproval;
    expect(state.responder).toBeUndefined();
    expect(state.authorizeRequest).toBeUndefined();
    expect(state.choice).toBeUndefined();
  });

  describe('acceptRequest()', () => {
    test('throws if no wallet', async () => {
      await localExtStorage.set('wallets', []);

      await expect(() =>
        useStore.getState().txApproval.acceptRequest({
          authorizeRequest: authorizeRequest.toJson() as JsonObject,
        }),
      ).rejects.toThrowError('No found wallet');

      expect(useStore.getState().txApproval.authorizeRequest).toBeUndefined();
    });

    test('accepts a request and sets state correctly', async () => {
      void useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      await waitForAuthorizeRequestSet();

      expect(useStore.getState().txApproval.authorizeRequest).toEqual(
        authorizeRequest.toJsonString(),
      );
    });

    test('throws if another request is pending', async () => {
      // First request
      void useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      // Second request should throw
      await expect(
        useStore.getState().txApproval.acceptRequest({
          authorizeRequest: authorizeRequest.toJson() as JsonObject,
        }),
      ).rejects.toThrow('Another request is still pending');
    });
  });

  describe('setChoice()', () => {
    test('sets choice correctly', () => {
      void useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      useStore.getState().txApproval.setChoice(UserChoice.Approved);
      expect(useStore.getState().txApproval.choice).toBe(UserChoice.Approved);

      useStore.getState().txApproval.setChoice(UserChoice.Denied);
      expect(useStore.getState().txApproval.choice).toBe(UserChoice.Denied);
    });
  });

  describe('sendResponse()', () => {
    test('throws if no request was accepted', () => {
      expect(() => useStore.getState().txApproval.sendResponse()).toThrow('No responder');
    });

    test('sends response and resets state', async () => {
      // Setup - accept a request
      const sliceResponse = useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      await waitForAuthorizeRequestSet();

      // Set the choice
      useStore.getState().txApproval.setChoice(UserChoice.Approved);

      // Send response
      useStore.getState().txApproval.sendResponse();

      await expect(sliceResponse).resolves.toMatchObject({
        authorizeRequest: authorizeRequest.toJson(),
        choice: UserChoice.Approved,
      });

      // State should be reset
      const state = useStore.getState().txApproval;
      expect(state.responder).toBeUndefined();
      expect(state.authorizeRequest).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });

    test('rejects if missing response data', async () => {
      // Setup - accept a request but don't set choice
      const request = useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      await waitForAuthorizeRequestSet();

      // Should reject when sending response without setting choice
      useStore.getState().txApproval.sendResponse();
      await expect(request).rejects.toThrow('Missing response data');

      // State should be reset
      const state = useStore.getState().txApproval;
      expect(state.responder).toBeUndefined();
      expect(state.authorizeRequest).toBeUndefined();
      expect(state.choice).toBeUndefined();
    });
  });
});
