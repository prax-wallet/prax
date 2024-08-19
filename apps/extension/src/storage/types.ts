import { AppParameters } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { KeyPrintJson } from '@penumbra-zone/crypto-web/encryption';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';

export interface OriginRecord {
  origin: string;
  choice: UserChoice;
  date: number;
}

// If one adds an optional field (newField: string | undefined), a migration is not necessary.
// If one adds a new required field (newField: string[]), a migration is necessary
// to have the default value in the database.
export interface LocalStorageState {
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
  isFreshWallet?: boolean;
  walletCreationBlockHeight?: number;
}
