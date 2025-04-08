/**
 * This file is the entrypoint for the main and only background service worker.
 *
 * It is responsible for initializing:
 * - listeners for chrome runtime events
 * - Services, with endpoint config and a wallet
 * - rpc services, router, and adapter
 * - session manager for rpc entry
 */

// side-effectful import attaches listeners
import './listeners';

// all rpc implementations, local and proxy
import { getRpcImpls } from './rpc';

// adapter
import { ConnectRouter, createContextValues, Client } from '@connectrpc/connect';
import { jsonOptions } from '@penumbra-zone/protobuf';
import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { connectChannelAdapter } from '@penumbra-zone/transport-dom/adapter';
import { assertValidSessionPort } from './senders/session';

// bad
import { servicesCtx } from '@penumbra-zone/services/ctx/prax';

// context
import { fvkCtx } from '@penumbra-zone/services/ctx/full-viewing-key';
import { getFullViewingKey } from './ctx/full-viewing-key';
import { walletIdCtx } from '@penumbra-zone/services/ctx/wallet-id';
import { getWalletId } from './ctx/wallet-id';
import { buildCtx } from '@penumbra-zone/services/ctx/build';
import { buildActions } from './offscreen-client';
import { buildParallel } from '@penumbra-zone/wasm/build';
import { authorizeCtx } from '@penumbra-zone/services/ctx/authorize';

// context clients
import { CustodyService, StakeService } from '@penumbra-zone/protobuf';
import { custodyClientCtx } from '@penumbra-zone/services/ctx/custody-client';
import { stakeClientCtx } from '@penumbra-zone/services/ctx/stake-client';
import { createDirectClient } from '@penumbra-zone/transport-dom/direct';
import { internalTransportOptions } from './transport-options';

// idb, querier, block processor
import { startWalletServices } from './wallet-services';

import { backOff } from 'exponential-backoff';
import { getAuthorizationData } from './ctx/auth';

const initHandler = async () => {
  const walletServices = startWalletServices();
  const rpcImpls = await getRpcImpls();

  let custodyClient: Client<typeof CustodyService> | undefined;
  let stakeClient: Client<typeof StakeService> | undefined;

  return connectChannelAdapter({
    jsonOptions,

    /** @see https://connectrpc.com/docs/node/implementing-services */
    routes: (router: ConnectRouter) =>
      rpcImpls.map(([serviceType, serviceImpl]) => router.service(serviceType, serviceImpl)),

    // context so impls can access storage, ui, other services, etc
    createRequestContext: req => {
      const contextValues = req.contextValues ?? createContextValues();

      // initialize or reuse context clients
      custodyClient ??= createDirectClient(CustodyService, handler, internalTransportOptions);
      stakeClient ??= createDirectClient(StakeService, handler, internalTransportOptions);
      contextValues.set(custodyClientCtx, custodyClient);
      contextValues.set(stakeClientCtx, stakeClient);

      // remaining context for all services
      contextValues.set(fvkCtx, getFullViewingKey);
      contextValues.set(walletIdCtx, getWalletId);
      contextValues.set(buildCtx, {
        buildActions: (d, s) =>
          Promise.resolve(buildActions(d.transactionPlan, d.witnessData, getFullViewingKey(), s)),
        buildTransaction: d =>
          Promise.resolve(
            buildParallel(d.actions, d.transactionPlan, d.witnessData, d.authorizationData),
          ),
      });

      contextValues.set(servicesCtx, () => walletServices);

      // discriminate context available to specific services
      const { pathname } = new URL(req.url);
      if (pathname.startsWith('/penumbra.custody.v1.Custody')) {
        contextValues.set(authorizeCtx, getAuthorizationData);
      }

      return Promise.resolve({ ...req, contextValues });
    },
  });
};

const handler = await backOff(() => initHandler(), {
  delayFirstAttempt: false,
  startingDelay: 5_000, // 5 seconds
  numOfAttempts: Infinity,
  maxDelay: 20_000, // 20 seconds
  retry: (e, attemptNumber) => {
    console.log("Prax couldn't start wallet services", attemptNumber, e);
    return true;
  },
});

CRSessionManager.init(PRAX, handler, assertValidSessionPort);

// https://developer.chrome.com/docs/extensions/reference/api/alarms
void chrome.alarms.create('blockSync', {
  periodInMinutes: 30,
  delayInMinutes: 0,
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'blockSync') {
    if (globalThis.__DEV__) {
      console.info('Background sync scheduled');
    }
  }
});
