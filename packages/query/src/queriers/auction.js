import { AuctionService } from '@penumbra-zone/protobuf';
import { createClient } from './utils.js';
import { DutchAuction, } from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
import { typeUrlMatchesTypeName } from '@penumbra-zone/types/protobuf';
export class AuctionQuerier {
    client;
    constructor({ grpcEndpoint }) {
        this.client = createClient(grpcEndpoint, AuctionService);
    }
    async auctionStateById(id) {
        const result = await this.client.auctionStateById({ id });
        // As more auction types are created, handle them here.
        if (typeUrlMatchesTypeName(result.auction?.typeUrl, DutchAuction.typeName)) {
            return DutchAuction.fromBinary(result.auction.value);
        }
        return undefined;
    }
}
