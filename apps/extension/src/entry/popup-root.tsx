import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { popupRouter } from '../routes/popup/router';

import { isOriginApprovalRequest, isPopupRequest, isTxApprovalRequest } from '../message/popup';
import { useStore } from '../state';
import { originApprovalSelector } from '../state/origin-approval';
import { txApprovalSelector } from '../state/tx-approval';

import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { ConnectError } from '@connectrpc/connect';

import '@repo/ui/styles/globals.css';

const listenPopup = (
  req: unknown,
  _: chrome.runtime.MessageSender,
  responder: (x: unknown) => void,
) => {
  if (isPopupRequest(req)) {
    chrome.runtime.onMessage.removeListener(listenPopup);
    void (async () => {
      document.addEventListener(
        /** @see https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event */
        'visibilitychange',
        () => {
          if (document.visibilityState === 'hidden') {
            window.close();
          }
        },
      );

      // Navigation API is available in chrome, but not yet typed.
      (window as typeof window & { navigation: EventTarget }).navigation.addEventListener(
        /** @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation/navigate_event */
        'navigate',
        () => window.close(),
      );

      try {
        if (isTxApprovalRequest(req)) {
          responder(await txApprovalSelector(useStore.getState()).acceptRequest(req));
        } else if (isOriginApprovalRequest(req)) {
          responder(await originApprovalSelector(useStore.getState()).acceptRequest(req));
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
};
chrome.runtime.onMessage.addListener(listenPopup);

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
