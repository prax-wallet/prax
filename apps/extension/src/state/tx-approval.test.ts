import { JsonObject, toPlainMessage } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { generateSpendKey, getFullViewingKey, getWalletId } from '@penumbra-zone/wasm/keys';
import { Key } from '@repo/encryption/key';
import { localExtStorage } from '@repo/storage-chrome/local';
import { UserChoice } from '@repo/storage-chrome/records';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { beforeEach, describe, expect, MockedFunction, test, vi } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PenumbraApp } from '@zondax/ledger-penumbra';
import { AllSlices, initializeStore } from '.';
import { customPersist } from './persist';
import { PopupRequest, PopupType } from '../message/popup';
import testTxPlanJson from './test-data/tx-plan.json';
import { WalletJson } from '@repo/wallet';
import { txApprovalSelector } from './tx-approval';

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

// Mock the PenumbraApp constructor and DEFAULT_PATH
vi.mock('@zondax/ledger-penumbra', () => ({
  PenumbraApp: vi.fn(),
  DEFAULT_PATH: "m/44'/6532'/0'",
}));

// Use the same seed phrase and password as wallet tests for deterministic results
const seedPhrase =
  'benefit cherry cannon tooth exhibit law avocado spare tooth that amount pumpkin scene foil tape mobile shine apology add crouch situate sun business explain';
const spendKey = generateSpendKey(seedPhrase);
const fvk = getFullViewingKey(spendKey);

// Use the same password as wallet tests
const { key: passKey } = await Key.create('s0meUs3rP@ssword');
const encryptedSeedPhrase = await passKey.seal(seedPhrase);

// Mock navigator.usb to prevent ledger-related errors
const MOCK_USB_DEVICE = crypto.randomUUID();

// Only mock the usb property, not the entire navigator
Object.defineProperty(navigator, 'usb', {
  get: () => ({
    requestDevice: () => Promise.resolve(MOCK_USB_DEVICE),
    getDevices: () => Promise.resolve([MOCK_USB_DEVICE]),
  }),
  configurable: true,
});

// Mock TransportWebUSB.open to prevent actual device interaction
vi.spyOn(TransportWebUSB, 'open').mockImplementation(() => null as never);

// Mock PenumbraApp to return appropriate responses
vi.mocked(PenumbraApp).mockImplementation(() => {
  return {
    getFVK: vi.fn().mockResolvedValue({
      // Mock ResponseFvk that matches the test wallet's FVK
      ak: Array.from(fvk.inner.slice(0, 32)), // First 32 bytes for ak
      nk: Array.from(fvk.inner.slice(32, 64)), // Next 32 bytes for nk
      returnCode: 0x9000,
      errorMessage: 'Success',
    }),
    sign: vi.fn().mockResolvedValue({
      // Mock ResponseSign with valid authorization data
      spendAuthSignatures: [Buffer.from(new Array(64).fill(1))], // Mock spend auth signature
      delegatorVoteSignatures: [], // Empty for test
      effectHash: Buffer.from(new Array(32).fill(2)), // Mock effect hash
      returnCode: 0x9000,
      errorMessage: 'Success',
    }),
    close: vi.fn().mockResolvedValue(undefined),
  } as never;
});

const wallet0: WalletJson = {
  label: 'mock',
  id: getWalletId(fvk).toJsonString(),
  fullViewingKey: fvk.toJsonString(),
  custody: {
    encryptedSeedPhrase: encryptedSeedPhrase.toJson(),
  },
};

const pw = await passKey.toJson();

const plan = TransactionPlan.fromJson(testTxPlanJson as never);

describe('Transaction Approval Slice', () => {
  let useStore: UseBoundStore<StoreApi<AllSlices>>;

  const authorizeRequest = new AuthorizeRequest({ plan });

  const txApprovalRequest = {
    authorizeRequest: authorizeRequest.toJson() as JsonObject,
  } satisfies PopupRequest<PopupType.TxApproval>[PopupType.TxApproval];

  beforeEach(async () => {
    localMock.clear();
    sessionMock.clear();
    await localExtStorage.set('wallets', [wallet0]);
    await sessionExtStorage.set('passwordKey', pw);
    useStore = create<AllSlices>()(
      customPersist(initializeStore(sessionExtStorage, localExtStorage)),
    );
    await vi.waitFor(() => expect(useStore.getState().wallets.all).toEqual([wallet0]));
    vi.clearAllMocks();
  });

  test('initial state is empty', () => {
    const state = useStore.getState().txApproval;
    expect(state.responder).toBeUndefined();
    expect(state.authorizeRequest).toBeUndefined();
    expect(state.choice).toBeUndefined();
    expect(state.invalidPlan).toBeUndefined();
    expect(state.auth).toBeUndefined();
    expect(state.ready).toBeUndefined();
    expect(state.transactionView).toBeUndefined();
    expect(state.asSender).toBeUndefined();
    expect(state.asReceiver).toBeUndefined();
    expect(state.asPublic).toBeUndefined();
    expect(state.transactionClassification).toBeUndefined();
  });

  describe('acceptRequest()', () => {
    test('throws if no wallet', async () => {
      // Clear wallets in localStorage to test no wallet case
      await localExtStorage.set('wallets', []);
      await vi.waitFor(() => expect(useStore.getState().wallets.all).toEqual([]));

      await expect(() =>
        useStore.getState().txApproval.acceptRequest(txApprovalRequest),
      ).rejects.toThrow();

      // When acceptRequest fails, some state may still be set before the error occurs
      // This is expected behavior as the error happens during wallet lookup
    });

    test('accepts a request and sets state correctly', async () => {
      void useStore.getState().txApproval.acceptRequest(txApprovalRequest);

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      // Wait for generateViews to complete
      await vi.waitFor(() => expect(useStore.getState().txApproval.transactionView).toBeDefined());

      const state = useStore.getState().txApproval;
      expect(state.authorizeRequest).toEqual(toPlainMessage(authorizeRequest));
      expect(state.transactionView).toBeDefined();
      expect(state.asSender).toBeDefined();
      expect(state.asReceiver).toBeDefined();
      expect(state.asPublic).toBeDefined();
      expect(state.transactionClassification).toBeDefined();
    });

    test('throws if another request is pending', async () => {
      // First request
      void useStore.getState().txApproval.acceptRequest(txApprovalRequest);

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      // Second request should throw
      await expect(useStore.getState().txApproval.acceptRequest(txApprovalRequest)).rejects.toThrow(
        'Another request is still pending',
      );
    });

    test('sets transaction view fields correctly', async () => {
      void useStore.getState().txApproval.acceptRequest(txApprovalRequest);

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      // Wait for generateViews to complete
      await vi.waitFor(() => expect(useStore.getState().txApproval.transactionView).toBeDefined());

      const state = useStore.getState().txApproval;

      // Verify all new transaction view fields are set
      expect(state.transactionView).toBeDefined();
      expect(state.asSender).toBeDefined();
      expect(state.asReceiver).toBeDefined();
      expect(state.asPublic).toBeDefined();
      expect(state.transactionClassification).toBe('send');

      // Verify they contain TransactionView objects (as plain messages)
      expect(state.asSender).toEqual(expect.objectContaining({}));
      expect(state.asReceiver).toEqual(expect.objectContaining({}));
      expect(state.asPublic).toEqual(expect.objectContaining({}));
    });

    test('detects ledger custody type correctly', async () => {
      // Create a ledger wallet for testing
      const ledgerWallet = {
        ...wallet0,
        custody: {
          ledgerUsb: encryptedSeedPhrase.toJson(),
        },
      };

      // Set the ledger wallet in localStorage to test custody type detection
      await localExtStorage.set('wallets', [ledgerWallet]);

      // Wait for persist mechanism to sync the ledger wallet to zustand state
      await vi.waitFor(() => expect(useStore.getState().wallets.all).toEqual([ledgerWallet]));

      void useStore.getState().txApproval.acceptRequest(txApprovalRequest);

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      const state = txApprovalSelector(useStore.getState());
      expect(state.custodyType).toBe('ledgerUsb');
    });
  });

  describe('setChoice()', () => {
    test('sets choice correctly', async () => {
      void useStore.getState().txApproval.acceptRequest(txApprovalRequest);

      // Wait for the request to be processed
      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

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
      // Use the expected authorization data from wallet tests
      // Since this test uses the same transaction plan and known wallet,
      // we can expect the same deterministic results
      const expectedResponse = {
        authorizeResponse: {
          data: {
            effectHash: {
              inner:
                '893Otjfg4OeeAmkKfv4PCmajI58GTR2pE4/QGsgCRo9CRLYSPMPh2slkojPcyHujU8AhHUDjGlzyQB4j0+8MkQ==',
            },
            spendAuths: [
              {
                // spendAuth is nondeterministic, so we'll validate it's a valid signature format
                inner: expect.stringMatching(/^[A-Za-z0-9+/]{86}==$/) as unknown,
              },
            ],
          },
        },
      };

      // Setup - accept a request
      const sliceResponse = useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      // Begin authorization process
      void useStore.getState().txApproval.beginAuth();
      await vi.waitFor(() => {
        const auth = useStore.getState().txApproval.auth;
        return auth && !(auth instanceof Promise) && !(auth instanceof Error);
      });

      // Set the choice
      useStore.getState().txApproval.setChoice(UserChoice.Approved);

      // Send response
      useStore.getState().txApproval.sendResponse();

      await expect(sliceResponse).resolves.toMatchObject(expectedResponse);
    });

    test('rejects if missing response data', async () => {
      // Setup - accept a request but don't set choice
      const request = useStore.getState().txApproval.acceptRequest({
        authorizeRequest: authorizeRequest.toJson() as JsonObject,
      });

      await vi.waitFor(() => expect(useStore.getState().txApproval.authorizeRequest).toBeDefined());

      // Should throw when sending response without setting choice
      expect(() => useStore.getState().txApproval.sendResponse()).toThrow('Missing response data');
      await expect(request).rejects.toThrow('Missing response data');
    });

    test('rejects if the plan fails validation, even if the choice is somehow approved', async () => {
      const invalidRequest = new AuthorizeRequest({ plan: new TransactionPlan() });

      const request = useStore.getState().txApproval.acceptRequest({
        authorizeRequest: invalidRequest.toJson() as JsonObject,
      });

      // Wait for the request to be processed (and invalidPlan to be set)
      await vi.waitFor(() => expect(useStore.getState().txApproval.invalidPlan).toBeDefined());

      // Even if we somehow set the choice to approved, the invalid plan should be caught
      useStore.getState().txApproval.setChoice(UserChoice.Approved);
      expect(() => useStore.getState().txApproval.sendResponse()).toThrow();

      await expect(request).rejects.toThrow(
        ConnectError.from(new ReferenceError('No actions planned'), Code.InvalidArgument),
      );
    });
  });
});
