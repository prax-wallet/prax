import { BlockProcessor } from '@penumbra-zone/query/block-processor';
import { RootQuerier } from '@penumbra-zone/query/root-querier';
import { IndexedDb } from '@penumbra-zone/storage/indexed-db';
import { ViewServer } from '@penumbra-zone/wasm/view-server';
import { ServicesInterface, WalletServices } from '@penumbra-zone/types/services';
import { FullViewingKey, WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { AssetId } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { CompactBlock } from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
import { SctFrontierRequest } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';

export interface ServicesConfig {
  readonly chainId: string;
  readonly grpcEndpoint: string;
  readonly walletId: WalletId;
  readonly fullViewingKey: FullViewingKey;
  readonly numeraires: AssetId[];
  readonly walletCreationBlockHeight: number | undefined;
  readonly compactFrontierBlockHeight: number | undefined;
}

export class Services implements ServicesInterface {
  private walletServicesPromise: Promise<WalletServices> | undefined;

  constructor(private config: ServicesConfig) {}

  // If getWalletServices() is called multiple times concurrently, they'll all
  // wait for the same promise rather than each starting their own
  // initialization process.
  public async getWalletServices(): Promise<WalletServices> {
    if (!this.walletServicesPromise) {
      this.walletServicesPromise = this.initializeWalletServices().catch((e: unknown) => {
        // If promise rejected, reset promise to `undefined` so next caller can try again.
        this.walletServicesPromise = undefined;
        throw e;
      });
    }

    void this.walletServicesPromise.then(({ blockProcessor }) => blockProcessor.sync());
    return this.walletServicesPromise;
  }

  // In the current construction, there's isn't an idiomatic way to distinguish between different
  // wallet states (ie. fresh versus existing wallets) past the onboarding phase. The wallet birthday
  // originally served as a proxy for effectuating this distinction, enabling the block processor
  // to skip heavy cryptographic operations like trial decryption and merkle tree operations like
  // poseidon hashing on TCT insertions. Now, the wallet birthday serves a different purpose:
  // identifying fresh wallets and performing a one-time request to retrieve the SCT frontier.
  // This snapshot is injected into into the view server state from which normal
  // block processor syncing can then resume.
  private async initializeWalletServices(): Promise<WalletServices> {
    const {
      chainId,
      grpcEndpoint,
      walletId,
      fullViewingKey,
      numeraires,
      walletCreationBlockHeight,
      compactFrontierBlockHeight,
    } = this.config;
    const querier = new RootQuerier({ grpcEndpoint });
    const registryClient = new ChainRegistryClient();
    const indexedDb = await IndexedDb.initialize({
      chainId,
      walletId,
      registryClient,
    });

    let viewServer: ViewServer | undefined;

    // We want to gate the type of initialization we do here
    let fullSyncHeight = await indexedDb.getFullSyncHeight();
    if (!fullSyncHeight && walletCreationBlockHeight && compactFrontierBlockHeight) {
      // Request compact frontier from full node (~1KB payload)
      let compact_frontier = await querier.sct.sctFrontier(
        new SctFrontierRequest({ withProof: false }),
      );
      await indexedDb.saveFullSyncHeight(compact_frontier.height);

      viewServer = await ViewServer.initialize_from_snapshot({
        fullViewingKey,
        getStoredTree: () => indexedDb.getStateCommitmentTree(),
        idbConstants: indexedDb.constants(),
        compact_frontier,
      });
    } else {
      viewServer = await ViewServer.initialize({
        fullViewingKey,
        getStoredTree: () => indexedDb.getStateCommitmentTree(),
        idbConstants: indexedDb.constants(),
      });
    }

    // Q. do we need to explicitly save the SCT to storage, or does initializing the view server do that for us already? forgot.
    // Q. why does refreshing cache increasing stored hashes in the table??
    // todo: we need to save the `compactFrontierBlockHeight` field to local extension storage.

    // Dynamically fetch binary file for genesis compact block
    const response = await fetch('./penumbra-1-genesis.bin');
    const genesisBinaryData = await response.arrayBuffer();

    const blockProcessor = new BlockProcessor({
      genesisBlock:
        chainId === 'penumbra-1'
          ? CompactBlock.fromBinary(new Uint8Array(genesisBinaryData))
          : undefined,
      viewServer,
      querier,
      indexedDb,
      stakingAssetId: registryClient.bundled.globals().stakingAssetId,
      numeraires,
      compactFrontierBlockHeight,
    });

    return { viewServer, blockProcessor, indexedDb, querier };
  }
}
