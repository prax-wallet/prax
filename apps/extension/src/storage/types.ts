import { AppParameters } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/app/v1/app_pb';
import { KeyPrintJson } from '@penumbra-zone/crypto-web/encryption';
import { Stringified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { WalletJson } from '@penumbra-zone/types/wallet';
import { AssetId } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/asset/v1/asset_pb';

export enum LocalStorageVersion {
  V1 = 'V1',
  V2 = 'V2',
}

export interface OriginRecord {
  origin: string;
  choice: UserChoice;
  date: number;
}

export interface LocalStorageState {
  wallets: WalletJson[];
  grpcEndpoint: string | undefined;
  frontendUrl: string | undefined;
  passwordKeyPrint: KeyPrintJson | undefined;
  fullSyncHeight: number | undefined;
  // TODO: It's likely that an array is not the best data structure for this in storage. Should revisit later.
  knownSites: OriginRecord[];
  params: Stringified<AppParameters> | undefined;
  numeraires: Stringified<AssetId>[];
}
