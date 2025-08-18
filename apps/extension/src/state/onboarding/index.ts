import { PlainMessage, toPlainMessage } from '@bufbuild/protobuf';
import { Transport } from '@connectrpc/connect';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { generateSpendKey, getFullViewingKey } from '@penumbra-zone/wasm/keys';
import { Key } from '@repo/encryption/key';
import { KeyPrint } from '@repo/encryption/key-print';
import type { ExtensionStorage } from '@repo/storage-chrome/base';
import type { LocalStorageState } from '@repo/storage-chrome/local';
import { Wallet } from '@repo/wallet';
import sample from 'lodash/sample';
import { AllSlices, SliceCreator } from '..';
import { OnboardConnectLedgerSlice, createOnboardConnectLedgerSlice } from './connect-ledger';
import { OnboardGeneratePhraseSlice, createOnboardGeneratePhraseSlice } from './generate-phrase';
import { OnboardImportPhraseSlice, createOnboardImportPhraseSlice } from './import-phrase';
import {
  getChainId,
  getFrontierBlockHeight,
  getNumeraires,
  getShuffledGrpcEndpoints,
  testGrpcEndpoint,
} from './util';
import type { SessionStorageState } from '@repo/storage-chrome/session';
import { bech32mWalletId } from '@penumbra-zone/bech32m/penumbrawalletid';

export interface OnboardRemoteOpts {
  chainRegistryClient?: ChainRegistryClient;
  transport?: Transport;
}

export type OnboardingCustody = 'generated' | 'imported' | 'ledger';

export interface OnboardingSlice {
  onboardingCustody: OnboardingCustody | null;

  updateHasPassword: () => Promise<void>;
  hasPassword?: boolean;

  updateHasWallets: () => Promise<void>;
  hasWallets?: number;

  beginOnboarding: (custodyChoice: OnboardingCustody) => void;

  // Sub-slices
  generatePhrase: OnboardGeneratePhraseSlice;
  importPhrase: OnboardImportPhraseSlice;
  connectLedger: OnboardConnectLedgerSlice;

  frontendUrl?: string;
  grpcEndpoint?: string;
  latestBlockHeight?: bigint;
  frontierBlockHeight?: bigint;
  numeraires?: PlainMessage<AssetId>[];

  onboardWallet: (key: Key) => Promise<void>;

  onboardFrontendUrl: (opts: OnboardRemoteOpts) => Promise<{ frontendUrl?: string }>;

  onboardGrpcEndpoint: (opts: OnboardRemoteOpts) => Promise<{ grpcEndpoint?: string }>;

  onboardBlockHeights: (
    opts: OnboardRemoteOpts,
  ) => Promise<{ latestBlockHeight?: bigint; frontierBlockHeight?: bigint }>;

  onboardNumeraires: (opts: OnboardRemoteOpts) => Promise<{ numeraires?: AssetId[] }>;

  onboardPassword: (password: string) => Promise<Key>;
}

export const createOnboardingSlice =
  (
    session: ExtensionStorage<SessionStorageState>,
    local: ExtensionStorage<LocalStorageState>,
  ): SliceCreator<OnboardingSlice> =>
  (set, get, store) => ({
    onboardingCustody: null,

    generatePhrase: createOnboardGeneratePhraseSlice(set, get, store),
    importPhrase: createOnboardImportPhraseSlice(set, get, store),
    connectLedger: createOnboardConnectLedgerSlice(set, get, store),

    updateHasPassword: async () => {
      const hasPassword = !!(await local.get('passwordKeyPrint'));
      set(state => {
        state.onboarding.hasPassword = hasPassword;
      });
    },

    updateHasWallets: async () => {
      const hasWallets = (await local.get('wallets')).length;
      set(state => {
        state.onboarding.hasWallets = hasWallets;
      });
    },

    beginOnboarding: (custodyType: OnboardingCustody) => {
      set(state => {
        state.onboarding.onboardingCustody = custodyType;
      });
    },

    onboardPassword: async (password: string) => {
      let key: Key | null = null;

      const keyPrintJson = await local.get('passwordKeyPrint');
      if (keyPrintJson) {
        // if key print exists, confirm the password
        const keyPrint = await KeyPrint.fromJson(keyPrintJson);
        key = await Key.recreate(password, keyPrint);

        if (!key) {
          throw new Error('Password does not match');
        }
      } else {
        // otherwise, create a new password
        const recreated = await Key.create(password);
        await local.set('passwordKeyPrint', await recreated.keyPrint.toJson());
        key = recreated.key;
      }

      const keyJson = await key.toJson();
      await session.set('passwordKey', keyJson);

      return key;
    },

    onboardWallet: async (key: Key) => {
      const { onboardingCustody } = get().onboarding;

      let label: string;
      let fullViewingKey: FullViewingKey;
      let custodyData = undefined;

      switch (onboardingCustody) {
        case 'generated': {
          label = 'Generated Wallet';
          const seedPhrase = get().onboarding.generatePhrase.phrase.join(' ');
          const spendKey = generateSpendKey(seedPhrase);
          fullViewingKey = getFullViewingKey(spendKey);
          custodyData = { encryptedSeedPhrase: await key.seal(seedPhrase) };
          break;
        }
        case 'imported': {
          label = 'Imported Wallet';
          const spendKey = generateSpendKey(get().onboarding.importPhrase.phrase.join(' '));
          fullViewingKey = getFullViewingKey(spendKey);
          custodyData = { encryptedSpendKey: await key.seal(spendKey.toJsonString()) };
          break;
        }
        case 'ledger': {
          label = 'Ledger Wallet';
          const { specificDevice, fullViewingKey: ledgerFvk } = get().onboarding.connectLedger;
          fullViewingKey = new FullViewingKey(ledgerFvk);
          custodyData = { ledgerUsb: await key.seal(JSON.stringify(specificDevice)) };
          break;
        }
        case null:
          throw new ReferenceError('Onboarding custody type not set');
        default:
          throw new TypeError('Invalid onboarding custody type');
      }

      const wallet = new Wallet(label, fullViewingKey, custodyData);

      // Check for duplicate wallet by ID
      const existingWallets = await local.get('wallets');

      if (
        existingWallets.some(existingWallet =>
          wallet.id.equals(WalletId.fromJsonString(existingWallet.id)),
        )
      ) {
        throw new Error(`Wallet with ${bech32mWalletId(wallet.id)} already exists`);
      }

      const wallets = [wallet.toJson(), ...existingWallets];
      const keyJson = await key.toJson();
      await local.set('wallets', wallets);
      await session.set('passwordKey', keyJson);
    },

    onboardFrontendUrl: async ({ chainRegistryClient }: OnboardRemoteOpts) => {
      let frontendUrl = await local.get('frontendUrl');
      if (frontendUrl) {
        set(state => {
          state.onboarding.frontendUrl = frontendUrl;
        });
      } else {
        const { frontends } = await chainRegistryClient!.remote.globals();
        frontendUrl = (
          frontends.find(frontend => frontend.name === 'Radiant Commons') ?? sample(frontends)
        )?.url;
        await local.set('frontendUrl', frontendUrl);
      }
      return { frontendUrl };
    },

    onboardGrpcEndpoint: async ({ chainRegistryClient, transport }: OnboardRemoteOpts) => {
      let grpcEndpoint = await local.get('grpcEndpoint');
      let latestBlockHeight = grpcEndpoint
        ? await testGrpcEndpoint(grpcEndpoint, transport)
        : undefined;

      if (!latestBlockHeight && navigator.onLine) {
        for (grpcEndpoint of await getShuffledGrpcEndpoints(chainRegistryClient!)) {
          latestBlockHeight = await testGrpcEndpoint(grpcEndpoint, transport);
          if (latestBlockHeight) {
            break;
          }
        }
      }

      set(state => {
        state.onboarding.grpcEndpoint = grpcEndpoint;
        state.onboarding.latestBlockHeight = latestBlockHeight;
      });

      if (grpcEndpoint) {
        await local.set('grpcEndpoint', grpcEndpoint);
      }

      return { grpcEndpoint };
    },

    onboardBlockHeights: async ({ transport }: OnboardRemoteOpts) => {
      const { onboardingCustody, latestBlockHeight } = get().onboarding;

      let frontierBlockHeight: bigint | undefined = undefined;

      if (onboardingCustody === 'generated') {
        if (latestBlockHeight) {
          await local.set('walletCreationBlockHeight', Number(latestBlockHeight));
        }

        frontierBlockHeight = (await getFrontierBlockHeight(transport!)) ?? latestBlockHeight;
        set(state => {
          state.onboarding.frontierBlockHeight = frontierBlockHeight;
        });
        if (frontierBlockHeight) {
          await local.set('compactFrontierBlockHeight', Number(frontierBlockHeight));
        }
      }

      return { frontierBlockHeight, latestBlockHeight };
    },

    onboardNumeraires: async ({ transport, chainRegistryClient }: OnboardRemoteOpts) => {
      let numeraires: AssetId[] = await local
        .get('numeraires')
        .then(numerairesJson => numerairesJson.map(n => AssetId.fromJsonString(n)));

      if (!numeraires.length) {
        numeraires = await getChainId(transport!).then(chainId =>
          getNumeraires(chainRegistryClient!, chainId),
        );
        await local.set(
          'numeraires',
          numeraires.map(n => n.toJsonString()),
        );
      }

      set(state => {
        state.onboarding.numeraires = numeraires.map(n => toPlainMessage(n));
      });

      return { numeraires };
    },
  });

export const onboardStartSelector = (state: AllSlices) => {
  const { beginOnboarding, hasWallets, hasPassword, updateHasWallets, updateHasPassword } =
    state.onboarding;

  if (hasWallets == null) {
    void updateHasWallets();
  }

  if (hasPassword == null) {
    void updateHasPassword();
  }

  return { hasWallets, beginOnboarding };
};

export const onboardPasswordSelector = (state: AllSlices) => {
  const { hasPassword, updateHasPassword, onboardPassword, onboardWallet } = state.onboarding;

  if (hasPassword == null) {
    void updateHasPassword();
  }

  return { hasPassword, onboardPassword, onboardWallet };
};

export const onboardingSetupSelector = (state: AllSlices) => {
  const { onboardBlockHeights, onboardFrontendUrl, onboardGrpcEndpoint, onboardNumeraires } =
    state.onboarding;
  return { onboardBlockHeights, onboardFrontendUrl, onboardGrpcEndpoint, onboardNumeraires };
};
