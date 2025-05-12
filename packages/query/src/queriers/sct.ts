import { Client } from '@connectrpc/connect';
import { createClient } from './utils';
import { SctService } from '@penumbra-zone/protobuf';
import { SctQuerierInterface } from '@penumbra-zone/types/querier';
import {
  TimestampByHeightRequest,
  TimestampByHeightResponse,
  SctFrontierRequest,
  SctFrontierResponse,
} from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';

export class SctQuerier implements SctQuerierInterface {
  private readonly client: Client<typeof SctService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, SctService);
  }

  timestampByHeight(req: TimestampByHeightRequest): Promise<TimestampByHeightResponse> {
    return this.client.timestampByHeight(req);
  }

  sctFrontier(req: SctFrontierRequest): Promise<SctFrontierResponse> {
    return this.client.sctFrontier(req);
  }
}
