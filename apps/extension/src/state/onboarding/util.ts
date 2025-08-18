import { Transport, createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { AppService, SctService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { shuffle } from 'lodash';
import { DEFAULT_GRPC } from '../../routes/page/onboarding/constants';

const shortTimeoutOpts = { timeoutMs: 5_000 };

export const testGrpcEndpoint = async (baseUrl: string, transport?: Transport) => {
  const tendermintClient = createClient(
    TendermintProxyService,
    (globalThis.__DEV__ ? transport : undefined) ?? createGrpcWebTransport({ baseUrl }),
  );
  const status = await tendermintClient.getStatus({}, shortTimeoutOpts).catch(() => undefined);

  return status?.syncInfo?.latestBlockHeight;
};
export const getShuffledGrpcEndpoints = async (chainRegistryClient: ChainRegistryClient) => {
  const { rpcs } = await chainRegistryClient.remote.globals();

  const shuffledRpc = shuffle(rpcs.map(r => r.url));

  if (shuffledRpc.includes(DEFAULT_GRPC)) {
    shuffledRpc.unshift(...shuffledRpc.splice(shuffledRpc.indexOf(DEFAULT_GRPC), 1));
  }
  return shuffledRpc;
};

export const getFrontierBlockHeight = (transport: Transport) =>
  createClient(SctService, transport)
    .sctFrontier({ withProof: false }, shortTimeoutOpts)
    .then(
      ({ height }) => height,
      () => undefined,
    );

export const getChainId = (transport: Transport) =>
  createClient(AppService, transport)
    .appParameters({}, shortTimeoutOpts)
    .then(
      ({ appParameters }) => appParameters?.chainId,
      () => undefined,
    );

export const getNumeraires = async (chainRegistryClient: ChainRegistryClient, chainId?: string) =>
  chainId
    ? chainRegistryClient.remote.get(chainId).then(
        r => r.numeraires,
        () => [],
      )
    : [];
