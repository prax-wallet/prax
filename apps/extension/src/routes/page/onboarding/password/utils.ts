import { Location } from 'react-router-dom';
import { LocationState, SEED_PHRASE_ORIGIN } from './types';
import { PagePath } from '../../paths';
import { usePageNav } from '../../../../utils/navigate';
import { ChainRegistryClient, EntityMetadata } from '@penumbra-labs/registry';
import { sample } from 'lodash';
import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { localExtStorage } from '../../../../storage/local';
import { AppService } from '@penumbra-zone/protobuf';
import { fetchBlockHeightWithFallback } from '../../../../hooks/latest-block-height';
import { bech32mAssetId } from '@penumbra-zone/bech32m/passet';

export const getSeedPhraseOrigin = (location: Location): SEED_PHRASE_ORIGIN => {
  const state = location.state as Partial<LocationState> | undefined;
  if (
    state &&
    typeof state.seedPhrase === 'string' &&
    Object.values(SEED_PHRASE_ORIGIN).includes(state.seedPhrase)
  ) {
    return state.seedPhrase;
  }
  // Default to IMPORTED if the origin is not valid as it won't generate a walletCreationHeight
  return SEED_PHRASE_ORIGIN.IMPORTED;
};

export const navigateToPasswordPage = (
  nav: ReturnType<typeof usePageNav>,
  seedPhrase?: SEED_PHRASE_ORIGIN,
) => nav(PagePath.SET_PASSWORD, { state: { seedPhrase } });

// A request-level timeout that supersedes the channel transport-level timeout to prevent hanging requests.
const DEFAULT_TRANSPORT_OPTS = { timeoutMs: 5000 };

export const setOnboardingValuesInStorage = async (seedPhraseOrigin: SEED_PHRASE_ORIGIN) => {
  const chainRegistryClient = new ChainRegistryClient();
  const { rpcs, frontends } = await chainRegistryClient.remote.globals();

  // Define a canconcial default frontend
  const defaultFront = 'Radiant Commons';

  let selectedFrontend: EntityMetadata | undefined = frontends.find(
    frontend => frontend.name === defaultFront,
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

  if (seedPhraseOrigin === SEED_PHRASE_ORIGIN.GENERATED) {
    console.log('not using creation blockHeight', blockHeight);
    // await localExtStorage.set('walletCreationBlockHeight', blockHeight);
  }

  const { numeraires } = await chainRegistryClient.remote.get(appParameters.chainId);

  await localExtStorage.set('grpcEndpoint', rpc);
  await localExtStorage.set('frontendUrl', selectedFrontend.url);
  await localExtStorage.set(
    'numeraires',
    numeraires.map(n => bech32mAssetId(n)),
  );
};
