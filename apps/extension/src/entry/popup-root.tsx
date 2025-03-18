import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { popupRouter } from '../routes/popup/router';

import { useStore } from '../state';
import { originApprovalSelector } from '../state/origin-approval';
import { txApprovalSelector } from '../state/tx-approval';

import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { ConnectError } from '@connectrpc/connect';

import '@repo/ui/styles/globals.css';
import { ControlRequest, isControlRequest } from '../message/control';
import { DialogRequest, DialogTypeName, isDialogRequest } from '../message/internal-control/dialog';

const isControlDialogRequest = <D extends DialogTypeName>(
  dialogType: D,
  request: unknown,
): request is ControlRequest<'Dialog', DialogRequest<D>> =>
  isControlRequest('Dialog', request) && isDialogRequest(dialogType, request.Dialog);

chrome.runtime.onMessage.addListener(
  (msg: unknown, _: chrome.runtime.MessageSender, responder: (x: unknown) => void) => {
    if (isControlRequest('Dialog', msg)) {
      const req = msg.Dialog;
      try {
        if (isControlDialogRequest('AuthorizeTransaction', req)) {
          void txApprovalSelector(useStore.getState()).acceptRequest(req, responder);
        } else if (isControlDialogRequest('ApproveOrigin', req)) {
          originApprovalSelector(useStore.getState()).acceptRequest(req, responder);
        } else {
          throw new Error('Unknown popup request');
        }
      } catch (e) {
        responder({
          error: errorToJson(ConnectError.from(e), undefined),
        });
      }
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
