import { CnidariumQuerierInterface } from '@penumbra-zone/types/querier';
import { MerkleRoot } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
export declare class CnidariumQuerier implements CnidariumQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    fetchRemoteRoot(blockHeight: bigint): Promise<MerkleRoot>;
}
//# sourceMappingURL=cnidarium.d.ts.map