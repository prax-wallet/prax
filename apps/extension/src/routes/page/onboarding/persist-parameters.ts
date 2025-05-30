import { ChainRegistryClient, EntityMetadata } from '@penumbra-labs/registry';
import { sample } from 'lodash';
import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { localExtStorage } from '@repo/storage-chrome/local';
import { AppService, SctService } from '@penumbra-zone/protobuf';
import { fetchBlockHeightWithFallback } from '../../../hooks/latest-block-height';
import { SEED_PHRASE_ORIGIN } from './password/types';
import { DEFAULT_FRONTEND, DEFAULT_TRANSPORT_OPTS } from './constants';

export const setOnboardingValuesInStorage = async (seedPhraseOrigin: SEED_PHRASE_ORIGIN) => {
  const chainRegistryClient = new ChainRegistryClient();
  const { rpcs, frontends } = await chainRegistryClient.remote.globals();

  let selectedFrontend: EntityMetadata | undefined = frontends.find(
    frontend => frontend.name === 'Radiant Commons',
  );

  // If default frontend is not found, randomly sample a frontend.
  if (!selectedFrontend) {
    selectedFrontend = sample(frontends);
  }

  if (!selectedFrontend) {
    throw new Error('Registry missing frontends');
  }

  // Persist the frontend to LS storage.
  await localExtStorage.set('frontendUrl', DEFAULT_FRONTEND);

  // Queries for blockHeight regardless of SEED_PHRASE_ORIGIN as a means of testing endpoint for liveness.
  const { blockHeight, rpc } = await fetchBlockHeightWithFallback(rpcs.map(r => r.url));

  // Persist the RPC to LS storage.
  await localExtStorage.set('grpcEndpoint', rpc);

  if (seedPhraseOrigin === SEED_PHRASE_ORIGIN.NEWLY_GENERATED) {
    // Block processor identifier for denoting whether the wallet is freshly generated.
    await localExtStorage.set('walletCreationBlockHeight', blockHeight);

    // Wallet services identifier for denoting whether the wallet is freshly generated
    // and should fetch the frontier snapshot.
    try {
      const compactFrontier = await createClient(
        SctService,
        createGrpcWebTransport({ baseUrl: rpc }),
      ).sctFrontier({ withProof: false }, DEFAULT_TRANSPORT_OPTS);
      await localExtStorage.set('compactFrontierBlockHeight', Number(compactFrontier.height));
    } catch (error) {
      // Fallback: use current block height as a reasonable default
      await localExtStorage.set('compactFrontierBlockHeight', blockHeight);
    }
  }

  // Fetch registry and persist the numeraires to LS storage.
  const { appParameters } = await createClient(
    AppService,
    createGrpcWebTransport({ baseUrl: rpc }),
  ).appParameters({}, DEFAULT_TRANSPORT_OPTS);
  if (!appParameters?.chainId) {
    throw new Error('No chain id');
  }

  const { numeraires } = await chainRegistryClient.remote.get(appParameters.chainId);
  if (!numeraires.length) {
    throw new Error('Empty numeraires list from registry');
  }

  await localExtStorage.set(
    'numeraires',
    numeraires.map(n => n.toJsonString()),
  );
};
