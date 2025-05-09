import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { AllSlices } from '.';
import { produce } from 'immer';

import { localExtStorage } from '@repo/prax-storage/local';
import { LocalStorageState } from '@repo/prax-storage/types';
import { sessionExtStorage, SessionStorageState } from '@repo/prax-storage/session';
import { walletsFromJson } from '@penumbra-zone/types/wallet';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';

export type Middleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>;

type Persist = (f: StateCreator<AllSlices>) => StateCreator<AllSlices>;

type Setter = (
  partial: (state: AllSlices) => Partial<AllSlices> | AllSlices,
  replace?: boolean | undefined,
) => void;

export const customPersistImpl: Persist = f => (set, get, store) => {
  void (async function () {
    // Part 1: Get storage values and sync them to store
    const passwordKey = await sessionExtStorage.get('passwordKey');
    const wallets = await localExtStorage.get('wallets');
    const grpcEndpoint = await localExtStorage.get('grpcEndpoint');
    const knownSites = await localExtStorage.get('knownSites');
    const frontendUrl = await localExtStorage.get('frontendUrl');
    const numeraires = await localExtStorage.get('numeraires');

    set(
      produce((state: AllSlices) => {
        state.password.key = passwordKey;
        state.wallets.all = walletsFromJson(wallets);
        state.network.grpcEndpoint = grpcEndpoint;
        state.connectedSites.knownSites = knownSites;
        state.defaultFrontend.url = frontendUrl;
        state.numeraires.selectedNumeraires = numeraires;
      }),
    );

    // Part 2: when chrome.storage changes sync select fields to store
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        syncLocal(changes, set);
      }
      if (area === 'session') {
        syncSession(changes, set);
      }
    });
  })();

  return f(set, get, store);
};

function syncLocal(changes: Record<string, chrome.storage.StorageChange>, set: Setter) {
  if (changes['wallets']) {
    const wallets = changes['wallets'].newValue as LocalStorageState['wallets'] | undefined;
    set(
      produce((state: AllSlices) => {
        state.wallets.all = wallets ? walletsFromJson(wallets) : [];
      }),
    );
  }

  if (changes['fullSyncHeight']) {
    const stored = changes['fullSyncHeight'].newValue as
      | LocalStorageState['fullSyncHeight']
      | undefined;
    set(
      produce((state: AllSlices) => {
        state.network.fullSyncHeight = stored ?? 0;
      }),
    );
  }

  if (changes['grpcEndpoint']) {
    const stored = changes['grpcEndpoint'].newValue as
      | LocalStorageState['grpcEndpoint']
      | undefined;
    set(
      produce((state: AllSlices) => {
        state.network.grpcEndpoint = stored ?? state.network.grpcEndpoint;
      }),
    );
  }

  if (changes['knownSites']) {
    const stored = changes['knownSites'].newValue as LocalStorageState['knownSites'] | undefined;
    set(
      produce((state: AllSlices) => {
        state.connectedSites.knownSites = stored ?? state.connectedSites.knownSites;
      }),
    );
  }

  if (changes['frontendUrl']) {
    const stored = changes['frontendUrl'].newValue as LocalStorageState['frontendUrl'] | undefined;
    set(
      produce((state: AllSlices) => {
        state.defaultFrontend.url = stored ?? state.defaultFrontend.url;
      }),
    );
  }

  if (changes['numeraires']) {
    const stored = changes['numeraires'].newValue as LocalStorageState['numeraires'] | undefined;
    set(
      produce((state: AllSlices) => {
        state.numeraires.selectedNumeraires = stored ?? state.numeraires.selectedNumeraires;
      }),
    );
  }

  if (changes['params']) {
    const stored = changes['params'].newValue as LocalStorageState['params'] | undefined;
    set(
      produce((state: AllSlices) => {
        state.network.chainId = stored
          ? AppParameters.fromJsonString(stored).chainId
          : state.network.chainId;
      }),
    );
  }
}

function syncSession(changes: Record<string, chrome.storage.StorageChange>, set: Setter) {
  if (changes['hashedPassword']) {
    const item = changes['hashedPassword'].newValue as
      | SessionStorageState['passwordKey']
      | undefined;
    set(
      produce((state: AllSlices) => {
        state.password.key = item ? item : undefined;
      }),
    );
  }
}

export const customPersist = customPersistImpl as Middleware;
