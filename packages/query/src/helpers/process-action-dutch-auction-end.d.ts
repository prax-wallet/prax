import { ActionDutchAuctionEnd } from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
import { IndexedDbInterface } from '@penumbra-zone/types/indexed-db';
import { AuctionQuerierInterface } from '@penumbra-zone/types/querier';
export declare const processActionDutchAuctionEnd: (action: ActionDutchAuctionEnd, auctionQuerier: AuctionQuerierInterface, indexedDb: IndexedDbInterface) => Promise<void>;
//# sourceMappingURL=process-action-dutch-auction-end.d.ts.map