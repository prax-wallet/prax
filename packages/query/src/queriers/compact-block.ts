import { Client } from '@connectrpc/connect';
import {
  CompactBlock,
  CompactBlockRangeRequest,
} from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
import { CompactBlockService } from '@penumbra-zone/protobuf';
import { createClient } from './utils';
import type {
  CompactBlockQuerierInterface,
  CompactBlockRangeParams,
} from '@penumbra-zone/types/querier';

export class CompactBlockQuerier implements CompactBlockQuerierInterface {
  private readonly client: Client<typeof CompactBlockService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, CompactBlockService);
  }

  async *compactBlockRange({
    startHeight,
    keepAlive,
    abortSignal,
  }: CompactBlockRangeParams): AsyncIterable<CompactBlock> {
    const req = new CompactBlockRangeRequest({ keepAlive, startHeight });
    const iterable = this.client.compactBlockRange(req, { signal: abortSignal });
    for await (const res of iterable) {
      if (!res.compactBlock) {
        throw new Error('No block in response');
      }
      yield res.compactBlock;
    }
  }
}
