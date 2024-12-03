import { CompactBlock } from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
import type { CompactBlockQuerierInterface, CompactBlockRangeParams } from '@penumbra-zone/types/querier';
export declare class CompactBlockQuerier implements CompactBlockQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    compactBlockRange({ startHeight, keepAlive, abortSignal, }: CompactBlockRangeParams): AsyncIterable<CompactBlock>;
}
//# sourceMappingURL=compact-block.d.ts.map