import { useEffect, useRef } from 'react';
import {
  isPopupRequest,
  isPopupRequestType,
  PopupError,
  PopupRequest,
  PopupResponse,
  PopupType,
} from '../message/popup';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { ConnectError } from '@connectrpc/connect';
import { isInternalSender } from '../senders/internal';
import { useStore } from '../state';
import { originApprovalSelector } from '../state/origin-approval';
import { txApprovalSelector } from '../state/tx-approval';

const listenPopup =
  (
    popupId: string,
    handle: <T extends PopupType>(message: PopupRequest<T>) => Promise<PopupResponse<T>>,
  ) =>
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: PopupResponse | PopupError) => void,
  ): boolean => {
    if (isInternalSender(sender) && isPopupRequest(popupId, message)) {
      void handle(message)
        .catch(e => ({ error: errorToJson(ConnectError.from(e), undefined) }))
        .then(sendResponse);
      return true;
    }
    return false;
  };

export const handlePopup = async <T extends PopupType>(
  popupRequest: PopupRequest extends PopupRequest<infer Q extends T> ? PopupRequest<Q> : never,
): Promise<PopupResponse extends PopupResponse<infer S extends T> ? PopupResponse<S> : never> => {
  if (isPopupRequestType(popupRequest, PopupType.TxApproval)) {
    return txApprovalSelector(useStore.getState()).acceptRequest(popupRequest);
  } else if (isPopupRequestType(popupRequest, PopupType.OriginApproval)) {
    return originApprovalSelector(useStore.getState()).acceptRequest(popupRequest);
  } else {
    throw new TypeError('Unknown popup type', { cause: popupRequest });
  }
};

/**
 * Announces component readiness to the extension worker, then listens for a
 * dialog initialization message.
 *
 * The initialization message responder is stored in the dialog's state slice
 * and eventually used by components to respond with the dialog result.
 */
export const usePopupReady = () => {
  const sentReady = useRef(new Set());
  const attachedListeners = useRef(new Set());

  useEffect(() => {
    if (!sentReady.current.size && !attachedListeners.current.size) {
      const popupId = new URL(window.location.href).searchParams.get('id');
      if (popupId) {
        const listener = listenPopup(popupId, handlePopup);
        chrome.runtime.onMessage.addListener(listener);
        attachedListeners.current.add(listener);
        void chrome.runtime.sendMessage(popupId);
        sentReady.current.add(popupId);
      }
    }
  }, [sentReady, attachedListeners, handlePopup]);
};
