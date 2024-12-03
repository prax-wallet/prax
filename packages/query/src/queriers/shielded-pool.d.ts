import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import type { ShieldedPoolQuerierInterface } from '@penumbra-zone/types/querier';
declare global {
    var __DEV__: boolean | undefined;
}
export declare class ShieldedPoolQuerier implements ShieldedPoolQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    assetMetadataById(assetId: AssetId): Promise<Metadata | undefined>;
}
//# sourceMappingURL=shielded-pool.d.ts.map