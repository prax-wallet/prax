/**
 * This file is the entrypoint for the main and only background service worker.
 *
 * It is responsible for initializing:
 * - listeners for chrome runtime events
 * - Services, with endpoint config and a wallet
 * - rpc services, router, and adapter
 * - session manager for rpc entry
 */

// listeners
import { contentScriptConnectListener } from './message/listen/content-script-connect';
import { contentScriptDisconnectListener } from './message/listen/content-script-disconnect';
import { contentScriptLoadListener } from './message/listen/content-script-load';
import { internalRevokeListener } from './message/listen/internal-revoke';
import { internalServiceListener } from './message/listen/internal-services';
import { externalEasterEggListener } from './message/listen/external-easteregg';

// all rpc implementations, local and proxy
import { getRpcImpls } from './rpc';

// adapter
import { ConnectRouter, createContextValues, Client } from '@connectrpc/connect';
import { jsonOptions } from '@penumbra-zone/protobuf';
import { CRSessionManager } from '@penumbra-zone/transport-chrome/session-manager';
import { connectChannelAdapter } from '@penumbra-zone/transport-dom/adapter';
import { validateSessionPort } from './senders/session';

// context
import { approverCtx } from '@penumbra-zone/services/ctx/approver';
import { fvkCtx } from '@penumbra-zone/services/ctx/full-viewing-key';
import { servicesCtx } from '@penumbra-zone/services/ctx/prax';
import { skCtx } from '@penumbra-zone/services/ctx/spend-key';
import { approveTransaction } from './approve-transaction';
import { getFullViewingKey } from './ctx/full-viewing-key';
import { getSpendKey } from './ctx/spend-key';
import { getWalletId } from './ctx/wallet-id';

// context clients
import { CustodyService, StakeService } from '@penumbra-zone/protobuf';
import { custodyClientCtx } from '@penumbra-zone/services/ctx/custody-client';
import { stakeClientCtx } from '@penumbra-zone/services/ctx/stake-client';
import { createDirectClient } from '@penumbra-zone/transport-dom/direct';
import { internalTransportOptions } from './transport-options';

// idb, querier, block processor
import { walletIdCtx } from '@penumbra-zone/services/ctx/wallet-id';
import type { Services } from '@repo/context';
import { startWalletServices } from './wallet-services';

import { backOff } from 'exponential-backoff';

import { localExtStorage } from '@repo/storage-chrome/local';
import { localMigrations } from '@repo/storage-chrome/migrations';

localExtStorage.enableMigration(localMigrations);

let walletServices: Promise<Services>;

const initHandler = async () => {
  walletServices = startWalletServices();
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
      contextValues.set(servicesCtx, () => walletServices);
      contextValues.set(walletIdCtx, getWalletId);

      // discriminate context available to specific services
      const { pathname } = new URL(req.url);
      if (pathname.startsWith('/penumbra.custody.v1.Custody')) {
        contextValues.set(skCtx, getSpendKey);
        contextValues.set(approverCtx, approveTransaction);
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

CRSessionManager.init(PRAX, handler, validateSessionPort);

// listen for content script activity
chrome.runtime.onMessage.addListener(contentScriptConnectListener);
chrome.runtime.onMessage.addListener(contentScriptDisconnectListener);
chrome.runtime.onMessage.addListener(contentScriptLoadListener);

// listen for internal revoke controls
chrome.runtime.onMessage.addListener(internalRevokeListener);

// listen for internal service controls
chrome.runtime.onMessage.addListener((req, sender, respond) =>
  internalServiceListener(walletServices, req, sender, respond),
);

// listen for external messages
chrome.runtime.onMessageExternal.addListener(externalEasterEggListener);

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
