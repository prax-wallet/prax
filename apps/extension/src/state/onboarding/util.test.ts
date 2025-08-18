import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createRouterTransport, Code, ConnectError } from '@connectrpc/connect';
import { AppService, SctService, TendermintProxyService } from '@penumbra-zone/protobuf';
import { testGrpcEndpoint, getFrontierBlockHeight, getChainId } from './util';
import { GetStatusResponse } from '@penumbra-zone/protobuf/penumbra/util/tendermint_proxy/v1/tendermint_proxy_pb';
import { AppParametersResponse } from '@penumbra-zone/protobuf/penumbra/core/app/v1/app_pb';
import { SctFrontierResponse } from '@penumbra-zone/protobuf/penumbra/core/component/sct/v1/sct_pb';

// Mock global
Object.defineProperty(global, '__DEV__', {
  value: false,
  writable: true,
});

describe('Onboarding Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('testGrpcEndpoint', () => {
    test('returns block height when endpoint responds', async () => {
      // Set dev mode to true so provided transport is used
      Object.defineProperty(global, '__DEV__', { value: true });

      const mockTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            return new GetStatusResponse({
              syncInfo: { latestBlockHeight: 12345n },
            });
          },
        });
      });

      const result = await testGrpcEndpoint('https://test-grpc.com', mockTransport);
      expect(result).toBe(12345n);

      // Reset dev mode
      Object.defineProperty(global, '__DEV__', { value: false });
    });

    test('returns undefined when endpoint fails', async () => {
      // Set dev mode to true so provided transport is used
      Object.defineProperty(global, '__DEV__', { value: true });

      const mockTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            throw new ConnectError('Connection failed', Code.Unknown);
          },
        });
      });

      const result = await testGrpcEndpoint('https://broken-grpc.com', mockTransport);
      expect(result).toBeUndefined();

      // Reset dev mode
      Object.defineProperty(global, '__DEV__', { value: false });
    });

    test('returns undefined when syncInfo is missing', async () => {
      // Set dev mode to true so provided transport is used
      Object.defineProperty(global, '__DEV__', { value: true });

      const mockTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            return new GetStatusResponse({ syncInfo: undefined });
          },
        });
      });

      const result = await testGrpcEndpoint('https://no-sync-grpc.com', mockTransport);
      expect(result).toBeUndefined();

      // Reset dev mode
      Object.defineProperty(global, '__DEV__', { value: false });
    });

    test('uses provided transport in dev mode', async () => {
      Object.defineProperty(global, '__DEV__', { value: true });

      const customTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            return new GetStatusResponse({
              syncInfo: { latestBlockHeight: 54321n },
            });
          },
        });
      });

      const result = await testGrpcEndpoint('https://dev-grpc.com', customTransport);
      expect(result).toBe(54321n);

      Object.defineProperty(global, '__DEV__', { value: false });
    });
  });

  // Skip getShuffledGrpcEndpoints tests - requires real ChainRegistryClient

  describe('getFrontierBlockHeight', () => {
    test('returns frontier height on success', async () => {
      const mockTransport = createRouterTransport(router => {
        router.service(SctService, {
          sctFrontier() {
            return new SctFrontierResponse({ height: 11111n });
          },
        });
      });

      const result = await getFrontierBlockHeight(mockTransport);
      expect(result).toBe(11111n);
    });

    test('returns undefined on error', async () => {
      const mockTransport = createRouterTransport(router => {
        router.service(SctService, {
          sctFrontier() {
            throw new ConnectError('Service unavailable', Code.Unknown);
          },
        });
      });

      const result = await getFrontierBlockHeight(mockTransport);
      expect(result).toBeUndefined();
    });
  });

  describe('getChainId', () => {
    test('returns chain ID on success', async () => {
      const mockTransport = createRouterTransport(router => {
        router.service(AppService, {
          appParameters() {
            return new AppParametersResponse({
              appParameters: { chainId: 'penumbra-testnet' },
            });
          },
        });
      });

      const result = await getChainId(mockTransport);
      expect(result).toBe('penumbra-testnet');
    });

    test('returns undefined when appParameters missing', async () => {
      const mockTransport = createRouterTransport(router => {
        router.service(AppService, {
          appParameters() {
            return new AppParametersResponse({ appParameters: undefined });
          },
        });
      });

      const result = await getChainId(mockTransport);
      expect(result).toBeUndefined();
    });

    test('returns undefined on error', async () => {
      const mockTransport = createRouterTransport(router => {
        router.service(AppService, {
          appParameters() {
            throw new ConnectError('Service unavailable', Code.Unknown);
          },
        });
      });

      const result = await getChainId(mockTransport);
      expect(result).toBeUndefined();
    });
  });

  // Skip getNumeraires tests - requires real ChainRegistryClient

  describe('Function contracts', () => {
    test('testGrpcEndpoint always returns string or undefined', async () => {
      // Set dev mode to true so provided transport is used
      Object.defineProperty(global, '__DEV__', { value: true });

      // Success case
      const successTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            return new GetStatusResponse({
              syncInfo: { latestBlockHeight: 123n },
            });
          },
        });
      });

      let result = await testGrpcEndpoint('https://test.com', successTransport);
      expect(result === undefined || typeof result === 'bigint').toBe(true);

      // Failure case
      const failTransport = createRouterTransport(router => {
        router.service(TendermintProxyService, {
          getStatus() {
            throw new ConnectError('fail', Code.Unknown);
          },
        });
      });

      result = await testGrpcEndpoint('https://test.com', failTransport);
      expect(result).toBeUndefined();

      // Reset dev mode
      Object.defineProperty(global, '__DEV__', { value: false });
    });

    // Skip getShuffledGrpcEndpoints test - requires real ChainRegistryClient
  });
});
