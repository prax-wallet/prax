import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { InternalFailure, InternalRequestType, InternalResponse } from '../message/internal';
import { isDialogMessage } from '../message/popup';
import { isInternalDialogRequest } from '../message/popup';
import { DialogRequest, DialogRequestType, DialogResponse } from '../message/popup';
import { postInternal } from '../post-internal';
import { isInternalSender } from '../senders/internal';
import { useStore } from '../state';
import { originApprovalSelector } from '../state/origin-approval';
import { txApprovalSelector } from '../state/tx-approval';

interface PromiseExecutors<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

const dialogConfig = async <M extends DialogRequestType>(
  dialogRequest: DialogRequest<M>,
  responder: PromiseExecutors<DialogResponse<M>>,
) => {
  console.debug('dialogConfig', dialogRequest, responder);
  try {
    if (isDialogMessage(DialogRequestType.AuthorizeTransaction, dialogRequest)) {
      const { acceptRequest } = txApprovalSelector(useStore.getState());
      await acceptRequest(dialogRequest, responder);
    } else if (isDialogMessage(DialogRequestType.ConnectDapp, dialogRequest)) {
      const { acceptRequest } = originApprovalSelector(useStore.getState());
      acceptRequest(dialogRequest, responder);
    } else {
      throw new Error('Unknown dialog init');
    }
  } catch (e) {
    responder.reject(e);
  }
};

// signals that react is ready (mounted) to service worker
export const usePopupReady = () => {
  console.debug('usePopupReady', window.location.href);
  const [ready, setReady] = useState<string | undefined>();

  const dialogId = useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get('id');
  }, [window.location.href]);

  console.log('usePopupReady dialogId', dialogId);

  const dialogInitListener = useCallback(
    (
      msg: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (x: InternalResponse<InternalRequestType.Dialog> | InternalFailure) => void,
    ) => {
      console.log('dialogInitListener checking...', { dialogId, sender, msg });
      if (!dialogId || !isInternalSender(sender) || !isInternalDialogRequest(dialogId, msg)) {
        console.debug(
          'dialogInitListener false',
          dialogId,
          isInternalSender(sender),
          dialogId && isInternalDialogRequest(dialogId, msg),
        );
        return false;
      }
      console.debug('dialogInitListener proceeding', msg);

      chrome.runtime.onMessage.removeListener(dialogInitListener);
      const { promise: response, ...responder } = Promise.withResolvers<DialogResponse>();
      void dialogConfig(msg.Dialog, responder);
      void response.then(
        Dialog => sendResponse({ Dialog }),
        e => sendResponse({ error: errorToJson(ConnectError.from(e), undefined) }),
      );
      return true;
    },
    [dialogId],
  );

  const attachDialogInitListener = useCallback(() => {
    console.debug('attachDialogInitListener', dialogId);
    if (dialogId) {
      if (!chrome.runtime.onMessage.hasListener(dialogInitListener)) {
        chrome.runtime.onMessage.addListener(dialogInitListener);
        void postInternal(InternalRequestType.Ready, dialogId);
        setReady(dialogId);
      }
    }
  }, [dialogId]);

  useEffect(() => {
    console.debug('usePopupReady useEffect', dialogId, ready);
    if (!ready && dialogId) {
      attachDialogInitListener();
    }
  }, [dialogId, ready, attachDialogInitListener]);
};
