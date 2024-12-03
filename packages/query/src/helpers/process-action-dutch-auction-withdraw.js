import { getAssetId } from '@penumbra-zone/getters/metadata';
import { getAuctionNftMetadata } from '@penumbra-zone/wasm/auction';
export const processActionDutchAuctionWithdraw = async (auctionId, seqNum, indexedDb) => {
    const metadata = getAuctionNftMetadata(auctionId, seqNum);
    await Promise.all([
        indexedDb.saveAssetsMetadata({ ...metadata, penumbraAssetId: getAssetId(metadata) }),
        indexedDb.upsertAuction(auctionId, {
            seqNum,
        }),
        indexedDb.deleteAuctionOutstandingReserves(auctionId),
    ]);
};
