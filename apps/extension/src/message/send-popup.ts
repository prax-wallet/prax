import { PopupRequest, PopupResponse, PopupError, PopupType } from './popup';
import { suppressChromeResponderDroppedError } from '../utils/chrome-errors';

export const POPUP_READY_TIMEOUT = 60 * 1000;

export const sendPopup = async <M extends PopupType>(
  id: string,
  popupType: M,
  request: PopupRequest<M>[M],
) => {
  const popupRequest = {
    id,
    [popupType]: request,
  } as PopupRequest<M>;

  return chrome.runtime
    .sendMessage<PopupRequest<M>, PopupResponse<M> | PopupError>(popupRequest)
    .catch(suppressChromeResponderDroppedError);
};

export const listenReady = (
  id: string,
  { resolve, reject }: Pick<PromiseWithResolvers<string>, 'resolve' | 'reject'>,
) => {
  const timeoutSignal = AbortSignal.timeout(POPUP_READY_TIMEOUT);
  timeoutSignal.addEventListener('abort', () => reject(timeoutSignal.reason));
  return (
    msg: unknown,
    _: chrome.runtime.MessageSender,
    respond: (response: null) => void,
  ): boolean => {
    if (id === msg) {
      resolve(id);
      respond(null);
      return true;
    }
    return false;
  };
};
