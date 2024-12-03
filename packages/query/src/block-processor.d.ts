import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import type { BlockProcessorInterface } from '@penumbra-zone/types/block-processor';
import type { IndexedDbInterface } from '@penumbra-zone/types/indexed-db';
import type { ViewServerInterface } from '@penumbra-zone/types/servers';
import { RootQuerier } from './root-querier.js';
import { CompactBlock } from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
declare global {
    var __DEV__: boolean | undefined;
    var __ASSERT_ROOT__: boolean | undefined;
}
interface QueryClientProps {
    querier: RootQuerier;
    indexedDb: IndexedDbInterface;
    viewServer: ViewServerInterface;
    numeraires: AssetId[];
    stakingAssetId: AssetId;
    genesisBlock: CompactBlock | undefined;
    walletCreationBlockHeight: number | undefined;
}
export declare class BlockProcessor implements BlockProcessorInterface {
    private readonly querier;
    private readonly indexedDb;
    private readonly viewServer;
    private readonly abortController;
    private numeraires;
    private readonly stakingAssetId;
    private syncPromise;
    private readonly genesisBlock;
    private readonly walletCreationBlockHeight;
    constructor({ indexedDb, viewServer, querier, numeraires, stakingAssetId, genesisBlock, walletCreationBlockHeight, }: QueryClientProps);
    sync: () => Promise<void>;
    stop: (r: string) => void;
    setNumeraires(numeraires: AssetId[]): void;
    /**
     * Sync local state to present. This method will
     * - identify current synced height (or `-1n` to represent a 'pre-genesis' state)
     * - query remote rpc for the chain's latest block height
     * - pre-genesis, initialize 0th epoch and validator info
     * - pre-genesis, process a local genesis block if provided
     * - query remote rpc to begin streaming at the next block
     * - iterate
     */
    private syncAndStore;
    private processBlock;
    private assertRootValid;
    private saveRecoveredCommitmentSources;
    private identifyNewAssets;
    private saveAndReturnMetadata;
    private saveAndReturnDelegationMetadata;
    private resolveNullifiers;
    /**
     * Identify various pieces of data from the transaction that we need to save,
     * such as metadata, liquidity positions, etc.
     */
    private processTransactions;
    /**
     * during wasm tx info generation later, wasm independently queries idb for
     * asset metadata, so we have to pre-populate. Auction NFTs aren't known by
     * the chain so aren't populated by identifyNewAssets.
     */
    private identifyAuctionNfts;
    /**
     * during wasm tx info generation later, wasm independently queries idb for
     * asset metadata, so we have to pre-populate. LpNft position states aren't
     * known by the chain so aren't populated by identifyNewAssets
     * - detect LpNft position opens
     * - generate all possible position state metadata
     * - update idb
     */
    private identifyLpNftPositions;
    private maybeUpsertAuctionWithNoteCommitment;
    private saveTransactions;
    private handleEpochTransition;
    private updateValidatorInfos;
    private updatePriceForValidatorDelegationToken;
}
export {};
//# sourceMappingURL=block-processor.d.ts.map