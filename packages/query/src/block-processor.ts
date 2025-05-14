import { AssetId, Metadata, Value } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { AuctionId } from '@penumbra-zone/protobuf/penumbra/core/component/auction/v1/auction_pb';
import {
  PositionState,
  PositionState_PositionStateEnum,
} from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { Nullifier } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';
import { ValidatorInfoResponse } from '@penumbra-zone/protobuf/penumbra/core/component/stake/v1/stake_pb';
import {
  Action,
  Transaction,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { StateCommitment } from '@penumbra-zone/protobuf/penumbra/crypto/tct/v1/tct_pb';
import { SpendableNoteRecord, SwapRecord } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import { auctionIdFromBech32 } from '@penumbra-zone/bech32m/pauctid';
import { bech32mIdentityKey } from '@penumbra-zone/bech32m/penumbravalid';
import { getAssetId } from '@penumbra-zone/getters/metadata';
import {
  getExchangeRateFromValidatorInfoResponse,
  getIdentityKeyFromValidatorInfoResponse,
} from '@penumbra-zone/getters/validator-info-response';
import { addAmounts, toDecimalExchangeRate } from '@penumbra-zone/types/amount';
import { assetPatterns, PRICE_RELEVANCE_THRESHOLDS } from '@penumbra-zone/types/assets';
import type { BlockProcessorInterface } from '@penumbra-zone/types/block-processor';
import { uint8ArrayToHex } from '@penumbra-zone/types/hex';
import type { IndexedDbInterface } from '@penumbra-zone/types/indexed-db';
import type { ViewServerInterface } from '@penumbra-zone/types/servers';
import { ScanBlockResult } from '@penumbra-zone/types/state-commitment-tree';
import { computePositionId, getLpNftMetadata } from '@penumbra-zone/wasm/dex';
import { customizeSymbol } from '@penumbra-zone/wasm/metadata';
import { backOff } from 'exponential-backoff';
import { updatePricesFromSwaps } from './helpers/price-indexer';
import { processActionDutchAuctionEnd } from './helpers/process-action-dutch-auction-end';
import { processActionDutchAuctionSchedule } from './helpers/process-action-dutch-auction-schedule';
import { processActionDutchAuctionWithdraw } from './helpers/process-action-dutch-auction-withdraw';
import { RootQuerier } from './root-querier';
import { AddressIndex, IdentityKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { getDelegationTokenMetadata } from '@penumbra-zone/wasm/stake';
import { toPlainMessage } from '@bufbuild/protobuf';
import { getAssetIdFromGasPrices } from '@penumbra-zone/getters/compact-block';
import { getSpendableNoteRecordCommitment } from '@penumbra-zone/getters/spendable-note-record';
import { getSwapRecordCommitment } from '@penumbra-zone/getters/swap-record';
import { CompactBlock } from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
import { identifyTransactions, RelevantTx } from './helpers/identify-txs';
import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { Amount } from '@penumbra-zone/protobuf/penumbra/core/num/v1/num_pb';
import { FmdParameters } from '@penumbra-zone/protobuf/penumbra/core/component/shielded_pool/v1/shielded_pool_pb';
import { shouldSkipTrialDecrypt } from './helpers/skip-trial-decrypt';
import { assetIdFromBaseDenom } from '@penumbra-zone/wasm/asset';

declare global {
  // eslint-disable-next-line no-var -- expected globals
  var __DEV__: boolean | undefined;
  // eslint-disable-next-line no-var -- expected globals
  var __ASSERT_ROOT__: boolean | undefined;
}

const PRE_GENESIS_SYNC_HEIGHT = -1n;

// Chunking policy is ~3x larger than the maximum number of state payloads that are supported
// inside a compact block (~100KB). We don't neccessarily need to determine the optimal chunk
// size, rather it needs to be sufficiently small that devices can handle crossing the syncing
// hurdle of processing the genesis block.
const GENESIS_CHUNK_SIZE = 500;

const isSwapRecordWithSwapCommitment = (
  r?: unknown,
): r is Exclude<SwapRecord, { swapCommitment: undefined }> =>
  r instanceof SwapRecord && r.swapCommitment instanceof StateCommitment;

const isSpendableNoteRecordWithNoteCommitment = (
  r?: unknown,
): r is Exclude<SpendableNoteRecord, { noteCommitment: undefined }> =>
  r instanceof SpendableNoteRecord && r.noteCommitment instanceof StateCommitment;

interface QueryClientProps {
  querier: RootQuerier;
  indexedDb: IndexedDbInterface;
  viewServer: ViewServerInterface;
  numeraires: AssetId[];
  stakingAssetId: AssetId;
  genesisBlock: CompactBlock | undefined;
  walletCreationBlockHeight: number | undefined;
  compactFrontierBlockHeight: number | undefined;
}

interface ProcessBlockParams {
  compactBlock: CompactBlock;
  latestKnownBlockHeight: bigint;
  skipTrialDecrypt?: boolean;
  skipScanBlock?: boolean;
}

const POSITION_STATES: PositionState[] = [
  new PositionState({ state: PositionState_PositionStateEnum.OPENED }),
  new PositionState({ state: PositionState_PositionStateEnum.CLOSED }),
  new PositionState({ state: PositionState_PositionStateEnum.WITHDRAWN, sequence: 0n }),
];

export class BlockProcessor implements BlockProcessorInterface {
  private readonly querier: RootQuerier;
  private readonly indexedDb: IndexedDbInterface;
  private readonly viewServer: ViewServerInterface;
  private readonly abortController: AbortController = new AbortController();
  private numeraires: AssetId[];
  private readonly stakingAssetId: AssetId;
  private syncPromise: Promise<void> | undefined;
  private readonly genesisBlock: CompactBlock | undefined;
  private readonly walletCreationBlockHeight: number | undefined;
  private readonly compactFrontierBlockHeight: number | undefined;

  constructor({
    indexedDb,
    viewServer,
    querier,
    numeraires,
    stakingAssetId,
    genesisBlock,
    walletCreationBlockHeight,
    compactFrontierBlockHeight,
  }: QueryClientProps) {
    this.indexedDb = indexedDb;
    this.viewServer = viewServer;
    this.querier = querier;
    this.numeraires = numeraires;
    this.stakingAssetId = stakingAssetId;
    this.genesisBlock = genesisBlock;
    this.walletCreationBlockHeight = walletCreationBlockHeight;
    this.compactFrontierBlockHeight = compactFrontierBlockHeight;
  }

  private async *streamBlocks(currentHeight: bigint) {
    let startHeight = currentHeight + 1n;

    yield* this.querier.compactBlock.compactBlockRange({
      startHeight,
      keepAlive: true,
      abortSignal: this.abortController.signal,
    });
  }

  // If sync() is called multiple times concurrently, they'll all wait for
  // the same promise rather than each starting their own sync process.
  public sync = (): Promise<void> =>
    (this.syncPromise ??= backOff(() => this.syncAndStore(), {
      delayFirstAttempt: false,
      startingDelay: 5_000, // 5 seconds
      numOfAttempts: Infinity,
      maxDelay: 20_000, // 20 seconds
      retry: async (e, attemptNumber) => {
        console.error(`Sync failure #${attemptNumber}: `, e);
        await this.viewServer.resetTreeToStored();
        return !this.abortController.signal.aborted;
      },
    })).finally(
      // if the above promise completes, exponential backoff has ended (aborted).
      // reset the rejected promise to allow for a new sync to be started.
      () => (this.syncPromise = undefined),
    );

  public stop = (r: string) => this.abortController.abort(`Sync stop ${r}`);

  setNumeraires(numeraires: AssetId[]): void {
    this.numeraires = numeraires;
  }

  /**
   * Sync local state to present. This method will
   * - identify current synced height (or `-1n` to represent a 'pre-genesis' state)
   * - query remote rpc for the chain's latest block height
   * - pre-genesis, initialize 0th epoch and validator info
   * - pre-genesis, process a local genesis block if provided
   * - query remote rpc to begin streaming at the next block
   * - iterate
   */
  private async syncAndStore() {
    // start at next block, or genesis if height is undefined
    const fullSyncHeight = await this.indexedDb.getFullSyncHeight();
    let currentHeight = fullSyncHeight ?? PRE_GENESIS_SYNC_HEIGHT;
    let currentEpoch =
      currentHeight && (await this.indexedDb.getEpochByHeight(currentHeight)).index;

    // this is the first network query of the block processor. use backoff to
    // delay until network is available
    let latestKnownBlockHeight = await backOff(
      async () => {
        const latest = await this.querier.tendermint.latestBlockHeight();
        if (!latest) {
          throw new Error('Unknown latest block height');
        }
        return latest;
      },
      { retry: () => true },
    );

    // Check that 'currentHeight' and 'compactFrontierBlockHeight' local extension
    // storage parameters match, signifying that this wallet was freshly generated
    // and triggering a one-time parameter initialization that would have otherwise occured
    // from fields pulled directly from the compact blocks. Otherwise, current height
    // is set to 'PRE_GENESIS_SYNC_HEIGHT' which will set of normal genesis syncing.

    if (
      this.compactFrontierBlockHeight &&
      this.compactFrontierBlockHeight >= currentHeight &&
      fullSyncHeight !== undefined
    ) {
      // Pull the app parameters from the full node, which other parameter setting (gas prices
      // for instance) will be derived from, rather than making additional network requests.
      const appParams = await this.querier.app.appParams();
      await this.indexedDb.saveAppParams(appParams);

      if (appParams.feeParams?.fixedGasPrices) {
        await this.indexedDb.saveGasPrices({
          ...toPlainMessage(appParams.feeParams.fixedGasPrices),
          assetId: toPlainMessage(this.stakingAssetId),
        });
      }

      if (appParams.feeParams?.fixedAltGasPrices) {
        for (const altGasFee of appParams.feeParams.fixedAltGasPrices) {
          if (altGasFee.assetId) {
            await this.indexedDb.saveGasPrices({
              ...toPlainMessage(altGasFee),
              assetId: toPlainMessage(altGasFee.assetId),
            });
          }
        }
      }

      if (appParams.shieldedPoolParams?.fmdMetaParams) {
        await this.indexedDb.saveFmdParams(
          new FmdParameters({
            precisionBits: 0,
            asOfBlockHeight: appParams.shieldedPoolParams.fmdMetaParams.fmdGracePeriodBlocks,
          }),
        );
      }

      // Finally, persist the frontier to IndexedDB.
      const flush = this.viewServer.flushUpdates();
      await this.indexedDb.saveScanResult(flush);
    }

    // handle the special case where no syncing has been done yet, and
    // prepares for syncing and checks for a bundled genesis block,
    // which can save time by avoiding an initial network request.
    if (currentHeight === PRE_GENESIS_SYNC_HEIGHT) {
      // create first epoch
      await this.indexedDb.addEpoch({ index: 0n, startHeight: 0n });

      // initialize validator info at genesis
      // TODO: use batch endpoint https://github.com/penumbra-zone/penumbra/issues/4688
      void this.updateValidatorInfos(0n);

      // conditional only runs if there is a bundled genesis block provided for the mainnet chain
      if (this.genesisBlock?.height === currentHeight + 1n) {
        currentHeight = this.genesisBlock.height;

        // determine whether to skip trial decryption at genesis
        const skipTrialDecrypt = shouldSkipTrialDecrypt(
          this.walletCreationBlockHeight,
          currentHeight,
        );

        // genesis sync requires crossing the wasm-boundary and performing heavy cryptographic operations
        // on ~32K state payloads in the compact block. Consequently, the block processor can't yield to
        // the event loop to finish setting up the listeners responsible for initializing neccessary content
        // scripts while performing this operation, leaving the service worker continuously busy with genesis
        // block sync.
        //
        // to prevent blocking the single-threaded service worker runtime, iterate through the genesis block's
        // state payloads in manageable chunks. This approach segments the computationally intensive tasks of
        // trial decryption and merkle poseidon hashing.
        for (
          let start = 0;
          start < this.genesisBlock.statePayloads.length;
          start += GENESIS_CHUNK_SIZE
        ) {
          // slice out a subset of state payloads
          const chunkedPayloads = this.genesisBlock.statePayloads.slice(
            start,
            start + GENESIS_CHUNK_SIZE,
          );

          const chunkedBlock = new CompactBlock({
            ...toPlainMessage(this.genesisBlock),
            statePayloads: chunkedPayloads,
          });

          // trial decrypts a chunk, according to some chunking policy, of the genesis block.
          await this.viewServer.scanGenesisChunk(BigInt(start), chunkedBlock, skipTrialDecrypt);

          // after trial decrypting all the chunks, check if this is the last chunk
          // in the batch.
          if (start + GENESIS_CHUNK_SIZE >= this.genesisBlock.statePayloads.length) {
            // processes the accumulated genesis notes by constructing the state commitment tree
            // and persisting relevant transaction data.
            await this.viewServer.genesisAdvice(this.genesisBlock);

            // process the compact block as normal, with the only difference being that we can avoid rescanning
            // the compact black again and skip that operation. Additionally, we enforce that regardless of the
            // standard flushing conditions, we *always* flush the genesis block to storage for safety. This will
            // eventually need to be done anyways, so might as well flush directly after processing the entire block.
            await this.processBlock({
              compactBlock: this.genesisBlock,
              latestKnownBlockHeight: latestKnownBlockHeight,
              skipTrialDecrypt,
              skipScanBlock: true,
            });
          }

          // critically, we yield the JS event loop after each chunk iteration.
          await new Promise<void>(resolve => {
            setTimeout(resolve, 0);
          });
        }
      }
    }

    // this is an indefinite stream of the (compact) chain from the network
    // intended to run continuously
    for await (const compactBlock of this.streamBlocks(currentHeight)) {
      // confirm block height to prevent corruption of local state
      if (compactBlock.height === currentHeight + 1n) {
        currentHeight = compactBlock.height;
      } else {
        throw new Error(`Unexpected block height: ${compactBlock.height} at ${currentHeight}`);
      }

      if (compactBlock.epochIndex !== currentEpoch) {
        throw new Error(`Unexpected epoch index: ${compactBlock.epochIndex} at ${currentEpoch}`);
      }

      // set the trial decryption flag for all other compact blocks
      const skipTrialDecrypt = shouldSkipTrialDecrypt(
        this.walletCreationBlockHeight,
        currentHeight,
      );

      await this.processBlock({
        compactBlock: compactBlock,
        latestKnownBlockHeight: latestKnownBlockHeight,
        skipTrialDecrypt,
      });

      // The presence of `epochRoot` indicates that this is the final block of the current epoch.
      if (compactBlock.epochRoot) {
        currentEpoch++;
        this.handleEpochTransition(
          compactBlock.height,
          latestKnownBlockHeight,
          currentEpoch,
          currentHeight,
        );
      }

      if (globalThis.__ASSERT_ROOT__) {
        await this.assertRootValid(compactBlock.height);
      }

      // We only query Tendermint for the latest known block height once, when
      // the block processor starts running. Once we're caught up, though, the
      // chain will of course continue adding blocks, and we'll keep processing
      // them. So, we need to update `latestKnownBlockHeight` once we've passed
      // it.
      if (compactBlock.height > latestKnownBlockHeight) {
        latestKnownBlockHeight = compactBlock.height;
      }
    }
  }

  /**
   * Logic for processing a compact block.
   */
  private async processBlock({
    compactBlock,
    latestKnownBlockHeight,
    skipTrialDecrypt = false,
    skipScanBlock = false,
  }: ProcessBlockParams) {
    if (compactBlock.appParametersUpdated) {
      await this.indexedDb.saveAppParams(await this.querier.app.appParams());
    }
    if (compactBlock.fmdParameters) {
      await this.indexedDb.saveFmdParams(compactBlock.fmdParameters);
    }
    if (compactBlock.gasPrices) {
      await this.indexedDb.saveGasPrices({
        ...toPlainMessage(compactBlock.gasPrices),
        assetId: toPlainMessage(this.stakingAssetId),
      });
    }
    if (compactBlock.altGasPrices.length) {
      for (const altGas of compactBlock.altGasPrices) {
        await this.indexedDb.saveGasPrices({
          ...toPlainMessage(altGas),
          assetId: getAssetIdFromGasPrices(altGas),
        });
      }
    }

    // wasm view server scan
    // - decrypts new notes
    // - decrypts new swaps
    // - updates idb with advice
    const scannerWantsFlush = skipScanBlock
      ? true
      : await this.viewServer.scanBlock(compactBlock, skipTrialDecrypt);

    // flushing is slow, avoid it until
    // - wasm says
    // - every 5000th block
    // - every block at tip
    const flushReasons = {
      scannerWantsFlush,
      interval: compactBlock.height % 5000n === 0n,
      new: compactBlock.height > latestKnownBlockHeight,
    };

    const recordsByCommitment = new Map<StateCommitment, SpendableNoteRecord | SwapRecord>();
    let flush: ScanBlockResult | undefined;
    if (Object.values(flushReasons).some(Boolean)) {
      flush = this.viewServer.flushUpdates();

      // in an atomic query, this
      // - saves 'sctUpdates'
      // - saves new decrypted notes
      // - saves new decrypted swaps
      // - updates last block synced
      await this.indexedDb.saveScanResult(flush);

      // - detect unknown asset types
      // - shielded pool for asset metadata
      // - or, generate default fallback metadata
      // - update idb
      await this.identifyNewAssets(flush.newNotes);

      for (const spendableNoteRecord of flush.newNotes) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: justify non-null assertion
        recordsByCommitment.set(spendableNoteRecord.noteCommitment!, spendableNoteRecord);
      }
      for (const swapRecord of flush.newSwaps) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: justify non-null assertion
        recordsByCommitment.set(swapRecord.swapCommitment!, swapRecord);
      }
    }

    // nullifiers on this block may match notes or swaps from db
    // - update idb, mark as spent/claimed
    // - return nullifiers used in this way
    const spentNullifiers = await this.resolveNullifiers(
      compactBlock.nullifiers,
      compactBlock.height,
    );

    // if a new record involves a state commitment, scan all block tx
    if (spentNullifiers.size || recordsByCommitment.size) {
      // compact block doesn't store transactions data, this query request it by rpc call
      const blockTx = await this.querier.app.txsByHeight(compactBlock.height);

      // Filter down to transactions & note records in block relevant to user
      const { relevantTxs, recoveredSourceRecords } = await identifyTransactions(
        spentNullifiers,
        recordsByCommitment,
        blockTx,
        addr => this.viewServer.isControlledAddress(addr),
      );

      // this simply stores the new records with 'rehydrated' sources to idb
      // TODO: this is the second time we save these records, after "saveScanResult"
      await this.saveRecoveredCommitmentSources(recoveredSourceRecords);

      await this.processTransactions(relevantTxs, recordsByCommitment, compactBlock.epochIndex);

      // at this point txinfo can be generated and saved. this will resolve
      // pending broadcasts, and populate the transaction list.
      // - calls wasm for each relevant tx
      // - saves to idb
      await this.saveTransactions(compactBlock.height, relevantTxs);
    }

    /**
     * This... really isn't great.
     *
     * You can see above that we're already iterating over flush.newNotes. So
     * why don't we put this call to
     * `this.maybeUpsertAuctionWithNoteCommitment()` inside that earlier `for`
     * loop?
     *
     * The problem is, we need to call `this.processTransactions()` before
     * calling `this.maybeUpsertAuctionWithNoteCommitment()`, because
     * `this.processTransactions()` is what saves the auction NFT metadata to
     * the database. `this.maybeUpsertAuctionWithNoteCommitment()` depends on
     * that auction NFT metadata being saved already to be able to detect
     * whether a given note is for an auction NFT; only then will it save the
     * note's commitment to the `AUCTIONS` table.
     *
     * "So why not just move `this.processTransactions()` to before the block
     * where we handle `flush.newNotes`?" Because `this.processTransactions()`
     * should only run after we've handled `flush.newNotes`, since we depend
     * on the result of the flush to determine whether there are transactions
     * to process in the first place. It's a catch-22.
     *
     * This isn't a problem in core because core isn't going back and forth
     * between Rust and TypeScript like we are. If and when we move the block
     * processor into Rust, this issue should be resolved.
     */
    for (const spendableNoteRecord of flush?.newNotes ?? []) {
      await this.maybeUpsertAuctionWithNoteCommitment(spendableNoteRecord);
    }

    // We do not store historical prices,
    // so there is no point in saving prices that would already be considered obsolete at the time of saving
    const blockInPriceRelevanceThreshold =
      compactBlock.height >= latestKnownBlockHeight - BigInt(PRICE_RELEVANCE_THRESHOLDS.default);

    // we can't use third-party price oracles for privacy reasons,
    // so we have to get asset prices from swap results during block scans
    // and store them locally in indexed-db.
    if (blockInPriceRelevanceThreshold && compactBlock.swapOutputs.length) {
      await updatePricesFromSwaps(
        this.indexedDb,
        this.numeraires,
        compactBlock.swapOutputs,
        compactBlock.height,
      );
    }
  }

  /*
   * Compares the locally stored, filtered TCT root with the actual one on chain. They should match.
   * This is expensive to do every block, so should only be done in development for debugging purposes.
   */
  private async assertRootValid(blockHeight: bigint): Promise<void> {
    const remoteRoot = await this.querier.cnidarium.fetchRemoteRoot(blockHeight);
    const inMemoryRoot = this.viewServer.getSctRoot();

    if (remoteRoot.equals(inMemoryRoot)) {
      console.debug(
        `Block height: ${blockHeight} root matches remote ✅ \n`,
        `Hash: ${uint8ArrayToHex(inMemoryRoot.inner)}`,
      );
    } else {
      console.warn(
        `Block height: ${blockHeight} root does not match remote ❌ \n`,
        `Local hash: ${uint8ArrayToHex(inMemoryRoot.inner)} \n`,
        `Remote hash: ${uint8ArrayToHex(remoteRoot.inner)}`,
      );
    }
  }

  private async saveRecoveredCommitmentSources(recovered: (SpendableNoteRecord | SwapRecord)[]) {
    for (const record of recovered) {
      if (isSpendableNoteRecordWithNoteCommitment(record)) {
        await this.indexedDb.saveSpendableNote({
          ...toPlainMessage(record),
          noteCommitment: toPlainMessage(getSpendableNoteRecordCommitment(record)),
        });
      } else if (isSwapRecordWithSwapCommitment(record)) {
        await this.indexedDb.saveSwap({
          ...toPlainMessage(record),
          swapCommitment: toPlainMessage(getSwapRecordCommitment(record)),
        });
      } else {
        throw new Error('Unexpected record type');
      }
    }
  }

  private async identifyNewAssets(notes: SpendableNoteRecord[]) {
    const saveOperations = [];

    for (const note of notes) {
      const assetId = note.note?.value?.assetId;
      if (!assetId) {
        continue;
      }

      saveOperations.push(this.saveAndReturnMetadata(assetId));
    }

    await Promise.all(saveOperations);
  }

  // TODO: refactor. there is definitely a better way to do this.  batch
  // endpoint issue https://github.com/penumbra-zone/penumbra/issues/4688
  private async saveAndReturnMetadata(assetId: AssetId): Promise<Metadata | undefined> {
    const metadataAlreadyInDb = await this.indexedDb.getAssetsMetadata(assetId);
    if (metadataAlreadyInDb) {
      return metadataAlreadyInDb;
    }

    const metadataFromNode = await this.querier.shieldedPool.assetMetadataById(assetId);

    // do not save IBC token metadata that are not in the prax registry
    const isIbcAsset = metadataFromNode && assetPatterns.ibc.matches(metadataFromNode.display);

    if (metadataFromNode && !isIbcAsset) {
      const customized = customizeSymbol(metadataFromNode);
      await this.indexedDb.saveAssetsMetadata({
        ...customized,
        penumbraAssetId: getAssetId(customized),
      });
      return metadataFromNode;
    }

    return undefined;
  }

  private async saveAndReturnDelegationMetadata(
    identityKey: IdentityKey,
  ): Promise<Metadata | undefined> {
    const delegationTokenAssetId = new AssetId({
      altBaseDenom: `udelegation_${bech32mIdentityKey(identityKey)}`,
    });

    const metadataAlreadyInDb = await this.indexedDb.getAssetsMetadata(delegationTokenAssetId);
    if (metadataAlreadyInDb) {
      return metadataAlreadyInDb;
    }

    const generatedMetadata = getDelegationTokenMetadata(identityKey);

    const customized = customizeSymbol(generatedMetadata);
    await this.indexedDb.saveAssetsMetadata({
      ...customized,
      penumbraAssetId: getAssetId(customized),
    });
    return generatedMetadata;
  }

  // Nullifier is published in network when a note is spent or swap is claimed.
  private async resolveNullifiers(nullifiers: Nullifier[], height: bigint) {
    const spentNullifiers = new Map<Nullifier, SpendableNoteRecord | SwapRecord>();
    const readOperations = [];
    const writeOperations = [];

    for (const nullifier of nullifiers) {
      const readPromise = (async () => {
        const record =
          (await this.indexedDb.getSpendableNoteByNullifier(nullifier)) ??
          (await this.indexedDb.getSwapByNullifier(nullifier));
        return { nullifier, record };
      })();

      readOperations.push(readPromise);
    }

    // Await all reads in parallel
    const readResults = await Promise.all(readOperations);

    // Process the read results and queue up write operations
    for (const { nullifier, record } of readResults) {
      if (!record) {
        continue;
      }

      // if the nullifier in the compact block matches the spendable note payload's nullifier
      // we decoded, then mark it as spent at the relavant block height.
      if (record instanceof SpendableNoteRecord) {
        record.heightSpent = height;
        const writePromise = this.indexedDb.saveSpendableNote({
          ...toPlainMessage(record),
          noteCommitment: toPlainMessage(getSpendableNoteRecordCommitment(record)),
        });
        writeOperations.push(writePromise);
      } else if (record instanceof SwapRecord) {
        record.heightClaimed = height;
        const writePromise = this.indexedDb.saveSwap({
          ...toPlainMessage(record),
          swapCommitment: toPlainMessage(getSwapRecordCommitment(record)),
        });
        writeOperations.push(writePromise);
      }

      spentNullifiers.set(nullifier, record);
    }

    // Await all writes in parallel
    await Promise.all(writeOperations);

    return spentNullifiers;
  }

  /**
   * Identify various pieces of data from the transaction that we need to save,
   * such as metadata, liquidity positions, liquidity tournament votes and rewards, etc.
   */
  private async processTransactions(
    txs: RelevantTx[],
    recordsByCommitment: Map<StateCommitment, SpendableNoteRecord | SwapRecord>,
    epochIndex: bigint,
  ) {
    // Process individual actions in each relevant transaction
    for (const { data, subaccount } of txs) {
      for (const { action } of data.body?.actions ?? []) {
        await Promise.all([
          this.identifyAuctionNfts(action),
          this.identifyLpNftPositions(action, subaccount),
        ]);
      }
    }

    // For certain actions embedded in the transaction, it's preferable to process the transaction,
    // for instance aggregating voting weight across multiple liquidity tournament (LQT) voting actions
    // into a single vote before saving it to the database.
    for (const { id, subaccount, data } of txs) {
      await Promise.all([this.identifyLiquidityTournamentVotes(data, id, epochIndex, subaccount)]);
    }

    // Identify liquidity tournament rewards associated with votes in the current epoch.
    await this.identifyLiquidityTournamentRewards(recordsByCommitment, epochIndex);
  }

  /**
   * during wasm tx info generation later, wasm independently queries idb for
   * asset metadata, so we have to pre-populate. Auction NFTs aren't known by
   * the chain so aren't populated by identifyNewAssets.
   */
  private async identifyAuctionNfts(action: Action['action']) {
    if (action.case === 'actionDutchAuctionSchedule' && action.value.description) {
      await processActionDutchAuctionSchedule(action.value.description, this.indexedDb);
    } else if (action.case === 'actionDutchAuctionEnd' && action.value.auctionId) {
      await processActionDutchAuctionEnd(action.value, this.querier.auction, this.indexedDb);
    } else if (action.case === 'actionDutchAuctionWithdraw' && action.value.auctionId) {
      await processActionDutchAuctionWithdraw(
        action.value.auctionId,
        action.value.seq,
        this.indexedDb,
      );
    }
  }

  /**
   * Identify liquidity tournament votes.
   */
  private async identifyLiquidityTournamentVotes(
    transaction: Transaction,
    transactionId: TransactionId,
    epochIndex: bigint,
    subaccount?: AddressIndex,
  ) {
    const totalVoteWeightByAssetId = new Map<AssetId, Amount>();
    let incentivizedAsset: AssetId | undefined;

    for (const { action } of transaction.body?.actions ?? []) {
      if (action.case === 'actionLiquidityTournamentVote' && action.value.body?.value) {
        const currentVoteAmount = action.value.body.value.amount;
        const currentVoteAssetId = action.value.body.value.assetId;

        if (!currentVoteAmount || !currentVoteAssetId) {
          continue;
        }

        // Incentivized asset the votes are associated with.
        const denom = action.value.body.incentivized?.denom;
        if (denom) {
          incentivizedAsset = assetIdFromBaseDenom(denom);
        }

        // Aggregate voting weight for each delegation token's asset ID.
        const currentVoteTotalByAssetId =
          totalVoteWeightByAssetId.get(currentVoteAssetId) ?? new Amount({ lo: 0n, hi: 0n });
        const newVoteTotal = new Amount({
          ...addAmounts(currentVoteTotalByAssetId, currentVoteAmount),
        });
        totalVoteWeightByAssetId.set(currentVoteAssetId, newVoteTotal);
      }
    }

    // Save the aggregated vote for each assetId in the historical voting table, indexed by epoch.
    for (const [delegationAssetId, voteWeight] of totalVoteWeightByAssetId.entries()) {
      const totalVoteWeightValue = new Value({
        amount: voteWeight,
        assetId: delegationAssetId,
      });

      // One DB save per delegation asset ID, potentially spanning multiple actions within the same transaction.
      // Initially, the voting reward will be empty.
      if (incentivizedAsset) {
        await this.indexedDb.saveLQTHistoricalVote(
          incentivizedAsset,
          epochIndex,
          transactionId,
          totalVoteWeightValue,
          undefined,
          undefined,
          subaccount?.account,
        );
      }
    }
  }

  /**
   * Identify liquidity tournament rewards.
   */
  private async identifyLiquidityTournamentRewards(
    recordsByCommitment: Map<StateCommitment, SpendableNoteRecord | SwapRecord>,
    epochIndex: bigint,
  ) {
    // Collect all distinct reward-bearing notes – we're checking if the note records
    // commitment source is from the liquidity tournament, indicating a reward.
    const rewardRecords: SpendableNoteRecord[] = [];
    for (const [, spendableNoteRecord] of recordsByCommitment) {
      if (spendableNoteRecord.source?.source.case === 'lqt' && 'note' in spendableNoteRecord) {
        if (spendableNoteRecord.note?.value) {
          rewardRecords.push(spendableNoteRecord);
        }
      }
    }

    // If we found rewards, fetching the existing votes.
    if (rewardRecords.length > 0) {
      // Retrieve the existing liquidity tournament votes for the specified epoch.
      for (const rewardValue of rewardRecords) {
        const existingVotes = await this.indexedDb.getLQTHistoricalVotes(
          epochIndex,
          rewardValue.addressIndex?.account,
        );

        for (const existingVote of existingVotes) {
          // This check rehydrates the reward value corresponding to the correct vote.
          // If the reward asset ID from the SNR matches the existing vote’s asset ID,
          // we can confidently apply the reward to that vote.
          if (rewardValue.note?.value?.assetId?.equals(existingVote.VoteValue.assetId)) {
            // Update the received reward for each corresponding vote in the epoch.
            //
            // Note: Each vote has an associated reward; however, the rewards are not cumulative —
            // the same reward applies to all votes for a given delegation.
            //
            // For example, if a user delegates to multiple validators, their votes will be tracked
            // separately per delegation. Each delegation may receive rewards in a different `delUM`
            // denomination, depending on the validator it was delegated to.
            //
            // As a result, the corresponding rewards will be denominated separately, using the
            // respective asset ID associated with each delegation's validator.
            await this.indexedDb.saveLQTHistoricalVote(
              existingVote.incentivizedAsset,
              epochIndex,
              existingVote.TransactionId,
              existingVote.VoteValue,
              rewardValue.note.value.amount,
              existingVote.id,
              existingVote.subaccount,
            );
          }
        }
      }
    }
  }

  /**
   * during wasm tx info generation later, wasm independently queries idb for
   * asset metadata, so we have to pre-populate. LpNft position states aren't
   * known by the chain so aren't populated by identifyNewAssets
   * - detect LpNft position opens
   * - generate all possible position state metadata
   * - update idb
   */
  private async identifyLpNftPositions(action: Action['action'], subaccount?: AddressIndex) {
    if (action.case === 'positionOpen' && action.value.position) {
      for (const state of POSITION_STATES) {
        const metadata = getLpNftMetadata(computePositionId(action.value.position), state);
        const customized = customizeSymbol(metadata);
        await this.indexedDb.saveAssetsMetadata({
          ...customized,
          penumbraAssetId: getAssetId(metadata),
        });
      }
      // to optimize on-chain storage PositionId is not written in the positionOpen action,
      // but can be computed via hashing of immutable position fields
      await this.indexedDb.addPosition(
        computePositionId(action.value.position),
        action.value.position,
        subaccount,
      );
    }
    if (action.case === 'positionClose' && action.value.positionId) {
      await this.indexedDb.updatePosition(
        action.value.positionId,
        new PositionState({ state: PositionState_PositionStateEnum.CLOSED }),
        subaccount,
      );
    }
    if (action.case === 'positionWithdraw' && action.value.positionId) {
      // Record the LPNFT for the current sequence number.
      const positionState = new PositionState({
        state: PositionState_PositionStateEnum.WITHDRAWN,
        sequence: action.value.sequence,
      });
      const metadata = getLpNftMetadata(action.value.positionId, positionState);
      const customized = customizeSymbol(metadata);
      await this.indexedDb.saveAssetsMetadata({
        ...customized,
        penumbraAssetId: getAssetId(metadata),
      });

      await this.indexedDb.updatePosition(action.value.positionId, positionState, subaccount);
    }
  }

  private async maybeUpsertAuctionWithNoteCommitment(spendableNoteRecord: SpendableNoteRecord) {
    const assetId = spendableNoteRecord.note?.value?.assetId;
    if (!assetId) {
      return;
    }

    const metadata = await this.indexedDb.getAssetsMetadata(assetId);
    const captureGroups = assetPatterns.auctionNft.capture(metadata?.display ?? '');
    if (!captureGroups) {
      return;
    }

    const auctionId = new AuctionId(auctionIdFromBech32(captureGroups.auctionId));

    await this.indexedDb.upsertAuction(auctionId, {
      noteCommitment: spendableNoteRecord.noteCommitment,
    });
  }

  private async saveTransactions(height: bigint, relevantTx: RelevantTx[]) {
    for (const { id, data } of relevantTx) {
      await this.indexedDb.saveTransaction(id, height, data);
    }
  }

  private async handleEpochTransition(
    endHeightOfPreviousEpoch: bigint,
    latestKnownBlockHeight: bigint,
    currentEpoch: bigint,
    currentHeight: bigint,
  ): Promise<void> {
    await this.indexedDb.addEpoch({ index: currentEpoch, startHeight: currentHeight });

    // TODO: seperately remove the estimation happening here and make
    // validator status updates actually atomic using indexedDB method.
    const nextEpochStartHeight = endHeightOfPreviousEpoch + 1n;
    const { sctParams } = (await this.indexedDb.getAppParams()) ?? {};
    const nextEpochIsLatestKnownEpoch =
      sctParams && latestKnownBlockHeight - nextEpochStartHeight < sctParams.epochDuration;

    // If we're doing a full sync from block 0, there could be hundreds or even
    // thousands of epoch transitions in the chain already. If we update
    // validator infos on every epoch transition, we'd be making tons of
    // unnecessary calls to the RPC node for validator infos. Instead, we'll
    // only get updated validator infos once we're within the latest known
    // epoch.
    if (nextEpochIsLatestKnownEpoch) {
      void this.updateValidatorInfos(nextEpochStartHeight);
    }
  }

  private async updateValidatorInfos(nextEpochStartHeight: bigint): Promise<void> {
    // It's important to clear the table so any stale (jailed, tombstoned, etc) entries are filtered out.
    await this.indexedDb.clearValidatorInfos();

    for await (const validatorInfoResponse of this.querier.stake.allValidatorInfos()) {
      if (!validatorInfoResponse.validatorInfo) {
        continue;
      }

      await this.indexedDb.upsertValidatorInfo(validatorInfoResponse.validatorInfo);

      await this.updatePriceForValidatorDelegationToken(
        validatorInfoResponse,
        nextEpochStartHeight,
      );
    }
  }

  private async updatePriceForValidatorDelegationToken(
    validatorInfoResponse: ValidatorInfoResponse,
    nextEpochStartHeight: bigint,
  ) {
    const identityKey = getIdentityKeyFromValidatorInfoResponse(validatorInfoResponse);

    const metadata = await this.saveAndReturnDelegationMetadata(identityKey);

    if (metadata) {
      const assetId = getAssetId(metadata);
      const exchangeRate = getExchangeRateFromValidatorInfoResponse(validatorInfoResponse);

      await this.indexedDb.updatePrice(
        assetId,
        this.stakingAssetId,
        toDecimalExchangeRate(exchangeRate),
        nextEpochStartHeight,
      );
    }
  }
}
