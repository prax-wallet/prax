import { useEffect, useRef } from 'react';
import {
  PopupRequest,
  PopupRequestData,
  PopupResponse,
  PopupResponseData,
  PopupType,
  typeOfPopupRequest,
} from '../message/popup';
import { useStore } from '../state';
import { listenPopup } from '../message/listen-popup';

const handlePopup = async <T extends PopupType>(
  popupRequest: PopupRequest<T>,
): Promise<PopupResponse<T>> => {
  const popupType = typeOfPopupRequest(popupRequest);
  const state = useStore.getState();

  // get the relevant slice's acceptRequest method
  const sliceHandler: {
    [k in PopupType]: (r: PopupRequestData<k>) => Promise<PopupResponseData<k>>;
  } = {
    TxApproval: state.txApproval.acceptRequest,
    OriginApproval: state.originApproval.acceptRequest,
  };

  // handle via slice
  const response: PopupResponseData<T> = await sliceHandler[popupType](popupRequest[popupType]);

  const popupResponse: PopupResponse<T> = {
    [popupType]: response,
  } as Record<typeof popupType, typeof response>;

  return popupResponse;
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
      const popupId = new URLSearchParams(window.location.search).get('id');
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
