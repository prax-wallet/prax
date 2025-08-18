import { Code, ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { PopupType, PopupRequest, PopupResponse, PopupError, isPopupRequest } from './popup';
import { isValidInternalSender } from '../senders/internal';

export const listenPopup =
  (
    popupId: string,
    handle: <T extends PopupType>(message: PopupRequest<T>) => Promise<PopupResponse<T>>,
    {
      onVisibilityChange = () =>
        document.visibilityState === 'hidden' ? window.close() : void null,
      onNavigation = () => window.close(),
      afterResponse = () => window.close(),
    }: {
      onVisibilityChange?: (ev: DocumentEventMap['visibilitychange']) => void;
      onNavigation?: (ev: Event) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      afterResponse?: (response: PopupResponse<any> | PopupError) => void;
    } = {},
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

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.navigation.addEventListener('navigate', onNavigation);

    void handle(message)
      .catch(e => ({ error: errorToJson(ConnectError.from(e, Code.Internal), undefined) }))
      .then(response => {
        console.debug('listen-popup sendResponse', response);
        sendResponse(response);
        afterResponse(response);
      });

    return true;
  };
