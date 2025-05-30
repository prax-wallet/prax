import type { ServiceType } from '@bufbuild/protobuf';
import type { ServiceImpl } from '@connectrpc/connect';
import { createClient } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import {
  AppService,
  CompactBlockService,
  CustodyService,
  DexService,
  GovernanceService,
  IbcChannelService,
  IbcClientService,
  IbcConnectionService,
  SctService,
  ShieldedPoolService,
  SimulationService,
  StakeService,
  TendermintProxyService,
  ViewService,
  FeeService,
} from '@penumbra-zone/protobuf';
import { custodyImpl } from '@penumbra-zone/services/custody-service';
import { sctImpl } from '@penumbra-zone/services/sct-service';
import { stakeImpl } from '@penumbra-zone/services/stake-service';
import { viewImpl } from '@penumbra-zone/services/view-service';
import { createProxyImpl, noContextHandler } from '@penumbra-zone/transport-dom/proxy';
import { onboardGrpcEndpoint } from '@repo/storage-chrome/onboard';
import { rethrowImplErrors } from './rethrow-impl-errors';

type RpcImplTuple<T extends ServiceType> = [T, Partial<ServiceImpl<T>>];

export const getRpcImpls = async () => {
  const webTransport = createGrpcWebTransport({ baseUrl: await onboardGrpcEndpoint() });

  const penumbraProxies: RpcImplTuple<ServiceType>[] = [
    AppService,
    CompactBlockService,
    DexService,
    GovernanceService,
    IbcChannelService,
    IbcClientService,
    IbcConnectionService,
    ShieldedPoolService,
    SimulationService,
    FeeService,
  ].map(
    serviceType =>
      [
        serviceType,
        createProxyImpl(serviceType, createClient(serviceType, webTransport), noContextHandler),
      ] as const,
  );

  const rpcImpls: RpcImplTuple<ServiceType>[] = [
    // rpc local implementations
    [CustodyService, rethrowImplErrors(CustodyService, custodyImpl)],
    [SctService, rethrowImplErrors(SctService, sctImpl)],
    [StakeService, rethrowImplErrors(StakeService, stakeImpl)],
    [ViewService, rethrowImplErrors(ViewService, viewImpl)],
    // customized proxy
    [
      TendermintProxyService,
      rethrowImplErrors(
        TendermintProxyService,
        createProxyImpl(
          TendermintProxyService,
          createClient(TendermintProxyService, webTransport),
          noContextHandler,
        ),
      ),
    ],
    // simple proxies
    ...penumbraProxies.map(
      ([serviceType, impl]) =>
        [serviceType, rethrowImplErrors(serviceType, impl)] as [typeof serviceType, typeof impl],
    ),
  ] as const;

  return rpcImpls;
};
