import { Client } from '@connectrpc/connect';
import { createClient } from './utils';
import { FeeService } from '@penumbra-zone/protobuf';
import { FeeQuerierInterface } from '@penumbra-zone/types/querier';
import {
  CurrentGasPricesRequest,
  CurrentGasPricesResponse,
} from '@penumbra-zone/protobuf/penumbra/core/component/fee/v1/fee_pb';

export class FeeQuerier implements FeeQuerierInterface {
  private readonly client: Client<typeof FeeService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, FeeService);
  }

  currentGasPrices(req: CurrentGasPricesRequest): Promise<CurrentGasPricesResponse> {
    return this.client.currentGasPrices(req);
  }
}
