import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import type { InternalResponse } from '@penumbra-zone/types/internal-msg/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import {
  isOriginApprovalRequest,
  isPopupRequest,
  isTxApprovalRequest,
  OriginApproval,
  TxApproval,
} from '../message/popup';
import { popupRouter } from '../routes/popup/router';
import { useStore } from '../state';
import { originApprovalSelector } from '../state/origin-approval';
import { txApprovalSelector } from '../state/tx-approval';

import '@repo/ui/styles/globals.css';

chrome.runtime.onMessage.addListener(
  (
    req: unknown,
    _: chrome.runtime.MessageSender,
    responder: (x: InternalResponse<TxApproval | OriginApproval>) => void,
  ) => {
    if (isPopupRequest(req)) {
      void (async () => {
        try {
          if (isTxApprovalRequest(req)) {
            await txApprovalSelector(useStore.getState()).acceptRequest(req, responder);
          } else if (isOriginApprovalRequest(req)) {
            originApprovalSelector(useStore.getState()).acceptRequest(req, responder);
          } else {
            throw new Error('Unknown popup request');
          }
        } catch (e) {
          responder({
            type: req.type,
            error: errorToJson(ConnectError.from(e), undefined),
          });
        }
      })();
      return true; // instruct chrome runtime to wait for a response
    }
    return false; // instruct chrome runtime we will not respond
  },
);

const MainPopup = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={popupRouter} />
      </QueryClientProvider>
    </StrictMode>
  );
};

const rootElement = document.getElementById('popup-root') as HTMLDivElement;
createRoot(rootElement).render(<MainPopup />);
