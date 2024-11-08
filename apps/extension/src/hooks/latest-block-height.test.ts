import { describe, expect, it } from 'vitest';
import { Code, ConnectError, createRouterTransport } from '@connectrpc/connect';
import { TendermintProxyService } from '@penumbra-zone/protobuf/penumbra/util/tendermint_proxy/v1/tendermint_proxy_connect';
import { fetchBlockHeightWithFallback } from './latest-block-height';
import { GetStatusResponse } from '@penumbra-zone/protobuf/penumbra/util/tendermint_proxy/v1/tendermint_proxy_pb';

const endpoints = ['rpc1.example.com', 'rpc2.example.com', 'rpc3.example.com'];

const getMock = (fn: () => GetStatusResponse) => {
  return createRouterTransport(router => {
    router.service(TendermintProxyService, {
      getStatus() {
        return fn();
      },
    });
  });
};

describe('fetchBlockHeightWithFallback', () => {
  it('should fetch block height successfully from the first endpoint', async () => {
    const mockTransport = getMock(
      () => new GetStatusResponse({ syncInfo: { latestBlockHeight: 800n } }),
    );
    const result = await fetchBlockHeightWithFallback(endpoints, mockTransport);
    expect(result.blockHeight).toEqual(800);
    expect(endpoints.includes(result.rpc)).toBeTruthy();
  });

  it('should fallback to the second endpoint if the first fails', async () => {
    let called = false;
    const mockTransport = getMock(() => {
      if (!called) {
        called = true;
        throw new ConnectError('Error calling service', Code.Unknown);
      }
      return new GetStatusResponse({ syncInfo: { latestBlockHeight: 800n } });
    });
    const result = await fetchBlockHeightWithFallback(endpoints, mockTransport);
    expect(result.blockHeight).toEqual(800);
    expect(endpoints.includes(result.rpc)).toBeTruthy();
    expect(called).toBeTruthy();
  });

  it('should fallback through all endpoints and throw an error if all fail', async () => {
    let timesCalled = 0;
    const mockTransport = getMock(() => {
      timesCalled++;
      throw new ConnectError('Error calling service', Code.Unknown);
    });
    await expect(() => fetchBlockHeightWithFallback(endpoints, mockTransport)).rejects.toThrow(
      new Error('All RPC endpoints failed to fetch the block height.'),
    );
    expect(timesCalled).toEqual(3);
  });

  it('should throw an error immediately if the endpoints array is empty', async () => {
    let timesCalled = 0;
    const mockTransport = getMock(() => {
      timesCalled++;
      throw new ConnectError('Error calling service', Code.Unknown);
    });
    await expect(() => fetchBlockHeightWithFallback([], mockTransport)).rejects.toThrow(
      new Error('All RPC endpoints failed to fetch the block height.'),
    );
    expect(timesCalled).toEqual(0);
  });
});
