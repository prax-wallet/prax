import { Location } from 'react-router-dom';
import { LocationState, SEED_PHRASE_ORIGIN } from './types';
import { PagePath } from '../../paths';
import { usePageNav } from '../../../../utils/navigate';
import { ChainRegistryClient, EntityMetadata } from '@penumbra-labs/registry';
import { sample } from 'lodash';
import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { localExtStorage } from '@repo/storage-chrome/local';
import { AppService, SctService } from '@penumbra-zone/protobuf';
import { fetchBlockHeightWithFallback } from '../../../../hooks/latest-block-height';

export const getSeedPhraseOrigin = (location: Location): SEED_PHRASE_ORIGIN => {
  const state = location.state as Partial<LocationState> | undefined;
  if (
    state &&
    typeof state.origin === 'string' &&
    Object.values(SEED_PHRASE_ORIGIN).includes(state.origin)
  ) {
    return state.origin;
  }

  return SEED_PHRASE_ORIGIN.IMPORTED;
};

export const navigateToPasswordPage = (
  nav: ReturnType<typeof usePageNav>,
  origin: SEED_PHRASE_ORIGIN,
) => nav(PagePath.SET_PASSWORD, { state: { origin } });

// A request-level timeout that supersedes the channel transport-level timeout to prevent hanging requests.
const DEFAULT_TRANSPORT_OPTS = { timeoutMs: 5000 };

export const setOnboardingValuesInStorage = async (seedPhraseOrigin: SEED_PHRASE_ORIGIN) => {
  const chainRegistryClient = new ChainRegistryClient();
  const { rpcs, frontends } = await chainRegistryClient.remote.globals();

  // Define a canconcial default frontend
  const defaultFrontend = 'Radiant Commons';
  const defaultDex = 'https://dex.penumbra.zone';

  let selectedFrontend: EntityMetadata | undefined = frontends.find(
    frontend => frontend.name === defaultFrontend,
  );

  // If default frontend is not found, randomly select a frontend
  if (!selectedFrontend) {
    selectedFrontend = sample(frontends);
  }

  if (!selectedFrontend) {
    throw new Error('Registry missing frontends');
  }

  // Queries for blockHeight regardless of SEED_PHRASE_ORIGIN as a means of testing endpoint for liveness
  const { blockHeight, rpc } = await fetchBlockHeightWithFallback(rpcs.map(r => r.url));

  const { appParameters } = await createClient(
    AppService,
    createGrpcWebTransport({ baseUrl: rpc }),
  ).appParameters({}, DEFAULT_TRANSPORT_OPTS);
  if (!appParameters?.chainId) {
    throw new Error('No chain id');
  }

  if (seedPhraseOrigin === SEED_PHRASE_ORIGIN.NEWLY_GENERATED) {
    // Flag associated with a dismissible popup that reminds the user to save their seed phrase.
    await localExtStorage.set('backupReminderSeen', false);

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

  // Safety: set these fields before in case there's an issue fetching the remote registry.
  await localExtStorage.set('grpcEndpoint', rpc);
  // override default frontend url with redirection to veil
  await localExtStorage.set('frontendUrl', defaultDex);

  const { numeraires } = await chainRegistryClient.remote.get(appParameters.chainId);

  await localExtStorage.set(
    'numeraires',
    numeraires.map(n => n.toJsonString()),
  );
};
