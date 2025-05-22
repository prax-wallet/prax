import { Code, ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { PopupType, PopupRequest, PopupResponse, PopupError, isPopupRequest } from './popup';
import { isValidInternalSender } from '../senders/internal';

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
    if (!isValidInternalSender(sender) || !isPopupRequest(popupId, message)) {
      return false;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        window.close();
      }
    });

    window.navigation.addEventListener('navigate', () => window.close());

    void handle(message)
      .catch(e => ({ error: errorToJson(ConnectError.from(e, Code.Internal), undefined) }))
      .then(sendResponse);

    return true;
  };
