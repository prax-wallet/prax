import { KeyPrintJson } from '@penumbra-zone/crypto-web/encryption';
import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { ExtensionStorageDefaults } from '../base';
import { OriginRecord } from '../types';
import { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { BoxJson } from '@penumbra-zone/types/box';

interface WalletJson {
  label: string;
  id: Stringified<WalletId>;
  fullViewingKey: Stringified<FullViewingKey>;
  custody: {
    encryptedSeedPhrase: BoxJson;
  };
}

export interface V1LocalStorageState {
  dbVersion: number;
  wallets: WalletJson[];
  grpcEndpoint: string | undefined;
  frontendUrl: string | undefined;
  passwordKeyPrint: KeyPrintJson | undefined;
  fullSyncHeight: number | undefined;
  // TODO: It's likely that an array is not the best data structure for this in storage. Should revisit later.
  knownSites: OriginRecord[];
  params: Stringified<AppParameters> | undefined;
  numeraires: Stringified<AssetId>[];
  walletCreationBlockHeight: number | undefined;
}

export const V1LocalDefaults: ExtensionStorageDefaults<V1LocalStorageState> = {
  wallets: [],
  fullSyncHeight: undefined,
  grpcEndpoint: undefined,
  knownSites: [],
  params: undefined,
  passwordKeyPrint: undefined,
  frontendUrl: undefined,
  numeraires: [],
  walletCreationBlockHeight: undefined,
};
