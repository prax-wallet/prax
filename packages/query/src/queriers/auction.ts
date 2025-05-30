import { AuctionQuerierInterface } from '@penumbra-zone/types/querier';
import { AuctionService } from '@penumbra-zone/protobuf';
import { Client } from '@connectrpc/connect';
import { createClient } from './utils';
import {
  AuctionId,
  DutchAuction,
} from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
import { typeUrlMatchesTypeName } from '@penumbra-zone/types/protobuf';

export class AuctionQuerier implements AuctionQuerierInterface {
  private readonly client: Client<typeof AuctionService>;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.client = createClient(grpcEndpoint, AuctionService);
  }

  async auctionStateById(id: AuctionId): Promise<
    // Add more auction types to this union type as they are created.
    DutchAuction | undefined
  > {
    const result = await this.client.auctionStateById({ id });

    // As more auction types are created, handle them here.
    if (typeUrlMatchesTypeName(result.auction?.typeUrl, DutchAuction.typeName)) {
      return DutchAuction.fromBinary(result.auction.value);
    }

    return undefined;
  }
}
