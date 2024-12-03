import { BatchSwapOutputData } from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { IndexedDbInterface } from '@penumbra-zone/types/indexed-db';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Amount } from '@penumbra-zone/protobuf/penumbra/core/num/v1/num_pb';
/**
 *
 * @param delta -  total amount of 'pricedAsset' that was input to the batch swap
 * @param unfilled - total amount of 'pricedAsset' that was returned unfilled
 * @param lambda - total amount of 'numeraire' that was output from the batch swap
 *  Price formula:
 *  price = (lambda)/(delta - unfilled)
 *  The price cannot be calculated if
 *  - lambda is zero
 *  - delta is zero
 *  - (delta - unfilled) is zero
 * @return 0 if the price cannot be calculated and some positive number if the price has been calculated.
 */
export declare const calculatePrice: (delta: Amount, unfilled: Amount, lambda: Amount) => number;
export declare const updatePricesFromSwaps: (indexedDb: IndexedDbInterface, numeraires: AssetId[], swapOutputs: BatchSwapOutputData[], height: bigint) => Promise<void>;
/**
 * Each 'BatchSwapOutputData' (BSOD) can generate up to two prices
 * Each BSOD in block has a unique trading pair
 * Trading pair has a canonical ordering, there's only one trading pair per pair of assets
 * Each BSOD can generate up to two prices
 * 1. pricedAsset -> numeraire (selling price)
 * 2. numeraire -> pricedAsset (buying price)
 * This function processes only (1) price and ignores (2) price
 * We can get a BSOD with zero deltas(inputs), and we shouldn't save the price in that case
 */
export declare const deriveAndSavePriceFromBSOD: (indexedDb: IndexedDbInterface, numeraireAssetId: AssetId, swapOutputs: BatchSwapOutputData[], height: bigint) => Promise<void>;
//# sourceMappingURL=price-indexer.d.ts.map