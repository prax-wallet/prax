import { Client } from '@connectrpc/connect';
import { createClient } from './utils';
import { ShieldedPoolService } from '@penumbra-zone/protobuf';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import type { ShieldedPoolQuerierInterface } from '@penumbra-zone/types/querier';

declare global {
  // eslint-disable-next-line no-var -- expected globals
  var __DEV__: boolean | undefined;
}

export class ShieldedPoolQuerier implements ShieldedPoolQuerierInterface {
  private readonly client: Client<typeof ShieldedPoolService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, ShieldedPoolService);
  }

  async assetMetadataById(assetId: AssetId): Promise<Metadata | undefined> {
    try {
      const { denomMetadata } = await this.client.assetMetadataById({ assetId });
      return denomMetadata;
    } catch (e) {
      if (globalThis.__DEV__) {
        console.debug(e);
      }
      return undefined;
    }
  }
}
