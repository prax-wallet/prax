import { KeyPrintJson } from '@penumbra-zone/crypto-web/encryption';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { OriginRecord } from '../types';
import { StorageItem } from './local-v1-migration';

// Note: previous local storage used to key a version on each individual field

export interface V0LocalStorageState {
  wallets?: StorageItem<WalletJson[]>;
  grpcEndpoint?: StorageItem<string | undefined>;
  frontendUrl?: StorageItem<string | undefined>;
  passwordKeyPrint?: StorageItem<KeyPrintJson | undefined>;
  fullSyncHeight?: StorageItem<number | undefined>;
  knownSites?: StorageItem<OriginRecord[]>;
  params?: StorageItem<Stringified<'AppParameters'> | undefined>;
  numeraires?: StorageItem<Stringified<'AssetId'>[]>;
}
