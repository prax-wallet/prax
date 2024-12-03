import { getAssetId } from '@penumbra-zone/getters/metadata';
import { getAuctionId, getAuctionNftMetadata } from '@penumbra-zone/wasm/auction';
export const processActionDutchAuctionSchedule = async (description, indexedDb) => {
    const auctionId = getAuctionId(description);
    // Always a sequence number of 0 when starting a Dutch auction
    const seqNum = 0n;
    const metadata = getAuctionNftMetadata(auctionId, seqNum);
    await Promise.all([
        indexedDb.saveAssetsMetadata({ ...metadata, penumbraAssetId: getAssetId(metadata) }),
        indexedDb.upsertAuction(auctionId, {
            auction: description,
            seqNum,
        }),
    ]);
};
