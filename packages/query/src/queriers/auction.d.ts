import { AuctionQuerierInterface } from '@penumbra-zone/types/querier';
import { AuctionId, DutchAuction } from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
export declare class AuctionQuerier implements AuctionQuerierInterface {
    private readonly client;
    constructor({ grpcEndpoint }: {
        grpcEndpoint: string;
    });
    auctionStateById(id: AuctionId): Promise<DutchAuction | undefined>;
}
//# sourceMappingURL=auction.d.ts.map