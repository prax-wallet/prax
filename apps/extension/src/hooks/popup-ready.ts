import { useCallback, useEffect, useRef, useState } from 'react';
import { PopupRequest, PopupResponse, PopupType, typeOfPopupRequest } from '../message/popup';
import { useStore } from '../state';
import { listenPopup } from '../message/listen-popup';

const handlePopup = async <T extends PopupType>(
  popupRequest: PopupRequest<T>,
): Promise<PopupResponse<T>> => {
  const popupType = typeOfPopupRequest(popupRequest);

  // get popup slice acceptRequest method
  const state = useStore.getState();
  const acceptRequest: {
    [k in PopupType]: (
      request: PopupRequest<k>[k],
      sender?: chrome.runtime.MessageSender,
    ) => Promise<PopupResponse<k>[k]>;
  } = {
    [PopupType.TxApproval]: state.txApproval.acceptRequest,
    [PopupType.OriginApproval]: state.originApproval.acceptRequest,
    [PopupType.LoginPrompt]: state.loginPrompt.acceptRequest,
  };

  try {
    // handle via slice
    const popupResponse = {
      [popupType]: await acceptRequest[popupType](popupRequest[popupType], popupRequest.sender),
    } as PopupResponse<T>;
    return popupResponse;
  } catch (e) {
    console.error('PopupReady', e);
    throw e;
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
  const io = useRef<{
    listen?: ReturnType<typeof listenPopup>;
    send?: Promise<unknown>;
  }>({ listen: undefined, send: undefined });

  const [popupId, setPopupId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const getReady = useCallback((id: string) => {
    if (!io.current.listen) {
      io.current.listen = listenPopup(id, handlePopup);
    }

    if (!chrome.runtime.onMessage.hasListener(io.current.listen)) {
      chrome.runtime.onMessage.addListener(io.current.listen);
    }

    if (!io.current.send) {
      io.current.send = chrome.runtime.sendMessage(id);
      return true;
    }

    throw new Error('Unreachable');
  }, []);

  useEffect(() => {
    if (!popupId) {
      setPopupId(new URLSearchParams(window.location.search).get('id'));
    } else if (!ready) {
      setReady(getReady(popupId));
    }
  }, [popupId, ready]);
};
