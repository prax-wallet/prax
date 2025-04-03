import { Code, ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { PopupType, PopupRequest, PopupResponse, PopupError, isPopupRequest } from './popup';
import { isInternalSender } from '../senders/internal';

export const listenPopup =
  (
    popupId: string,
    handle: <T extends PopupType>(message: PopupRequest<T>) => Promise<PopupResponse<T>>,
  ) =>
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendResponse: (response: PopupResponse<any> | PopupError) => void,
  ): boolean => {
    if (isInternalSender(sender) && isPopupRequest(popupId, message)) {
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

      void handle(message)
        .catch(e => ({ error: errorToJson(ConnectError.from(e, Code.Internal), undefined) }))
        .then(sendResponse);

      return true;
    }
    return false;
  };
