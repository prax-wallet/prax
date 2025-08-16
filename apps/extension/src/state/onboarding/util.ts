import { Transport, createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { AppService, SctService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { shuffle } from 'lodash';
import { DEFAULT_GRPC } from '../../routes/page/onboarding/constants';

export const testGrpcEndpoint = async (baseUrl: string, transport?: Transport) => {
  const tendermintClient = createClient(
    TendermintProxyService,
    (globalThis.__DEV__ ? transport : undefined) ?? createGrpcWebTransport({ baseUrl }),
  );
  const status = await tendermintClient.getStatus({}, { timeoutMs: 3000 }).catch(() => undefined);

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
    .sctFrontier({ withProof: false }, { timeoutMs: 5000 })
    .then(
      ({ height }) => height,
      () => undefined,
    );

export const getChainId = (transport: Transport) =>
  createClient(AppService, transport)
    .appParameters({}, { timeoutMs: 5000 })
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
