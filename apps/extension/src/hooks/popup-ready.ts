import { useEffect, useRef } from 'react';
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
    [k in PopupType]: (request: PopupRequest<k>[k]) => Promise<PopupResponse<k>[k]>;
  } = {
    [PopupType.TxApproval]: state.txApproval.acceptRequest,
    [PopupType.OriginApproval]: state.originApproval.acceptRequest,
  };

  // handle via slice
  const popupResponse = {
    [popupType]: await acceptRequest[popupType](popupRequest[popupType]),
  } as PopupResponse<T>;

  return popupResponse;
};

/**
 * Announces component readiness to the extension worker, then listens for a
 * dialog initialization message.
 *
 * The initialization message responder is stored in the dialog's state slice
 * and eventually used by components to respond with the dialog result.
 */
export const usePopupReady = (): PopupReadyContext => {
  const sentReady = useRef(new Set());
  const attachedListeners = useRef(new Set());

  const attention = useRef({
    required: true,
    setRequired: (yn: boolean) => {
      attention.current.required = yn;
    },
  });

  useEffect(() => {
    if (!sentReady.current.size && !attachedListeners.current.size) {
      const popupId = new URLSearchParams(window.location.search).get('id');
      if (popupId) {
        const listener = listenPopup(popupId, handlePopup, {
          onVisibilityChange: () => {
            if (attention.current.required && document.visibilityState === 'hidden') {
              window.close();
            }
          },
        });
        chrome.runtime.onMessage.addListener(listener);
        attachedListeners.current.add(listener);
        void chrome.runtime.sendMessage(popupId);
        sentReady.current.add(popupId);
      }
    }
  }, [sentReady, attachedListeners, handlePopup, attention.current]);

  return {
    attentionRequired: Boolean(attention.current.required),
    setAttentionRequired: (yn: boolean) => attention.current.setRequired(yn),
  };
};

export interface PopupReadyContext {
  attentionRequired: boolean;
  setAttentionRequired: (yn: boolean) => void;
}
