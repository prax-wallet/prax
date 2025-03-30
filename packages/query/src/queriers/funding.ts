import { Client } from '@connectrpc/connect';
import { createClient } from './utils';
import { FundingService } from '@penumbra-zone/protobuf';
import { FundingQuerierInterface } from '@penumbra-zone/types/querier';
import { Nullifier } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import {
  LqtCheckNullifierRequest,
  LqtCheckNullifierResponse,
} from '@penumbra-zone/protobuf/penumbra/core/component/funding/v1/funding_pb';

export class FundingQuerier implements FundingQuerierInterface {
  private readonly client: Client<typeof FundingService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, FundingService);
  }

  // Checks if a given nullifier has already been used in the current epoch of the liquidity tournament,
  // indicating that the delegation notes have already been used for voting.
  async lqtCheckNullifier(
    epochIndex: bigint,
    nullifier: Nullifier,
  ): Promise<LqtCheckNullifierResponse> {
    const lqtCheckNullifierRequest = new LqtCheckNullifierRequest({
      epochIndex,
      nullifier,
    });
    const lqtCheckNullifierResponse = await this.client.lqtCheckNullifier(lqtCheckNullifierRequest);

    const response = {
      transaction: lqtCheckNullifierResponse.transaction,
      alreadyVoted: lqtCheckNullifierResponse.alreadyVoted,
      epochIndex: lqtCheckNullifierResponse.epochIndex,
    } as LqtCheckNullifierResponse;

    return response;
  }
}
