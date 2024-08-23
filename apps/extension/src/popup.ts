import { sessionExtStorage } from './storage/session';
import { PopupMessage, PopupRequest, PopupType, PopupReadyResponse } from './message/popup';
import { PopupPath } from './routes/popup/paths';
import type { InternalRequest, InternalResponse } from '@penumbra-zone/types/internal-msg/shared';
import { Code, ConnectError } from '@connectrpc/connect';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';

type ChromeResponderDroppedMessage =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';

const isChromeResponderDroppedError = (
  e: unknown,
): e is Error & { message: ChromeResponderDroppedMessage } =>
  e instanceof Error &&
  e.message ===
    'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';

export const popup = async <M extends PopupMessage>(
  req: PopupRequest<M>,
): Promise<M['response']> => {
  const popupId = crypto.randomUUID();
  await spawnPopup(req.type, popupId);
  await popupReady(popupId);

  const response = await chrome.runtime
    .sendMessage<InternalRequest<M>, InternalResponse<M>>(req)
    .catch((e: unknown) => {
      if (isChromeResponderDroppedError(e)) {
        return null;
      } else {
        throw e;
      }
    });

  if (response && 'error' in response) {
    throw errorFromJson(response.error, undefined, ConnectError.from(response));
  } else {
    return response && response.data;
  }
};

const spawnDetachedPopup = async (path: string) => {
  await throwIfAlreadyOpen(path);

  const { top, left, width } = await chrome.windows.getLastFocused();

  await chrome.windows.create({
    url: path,
    type: 'popup',
    width: 400,
    height: 628,
    top,
    // press the window to the right side of screen
    left: left !== undefined && width !== undefined ? left + (width - 400) : 0,
  });
};

const throwIfAlreadyOpen = (path: string) =>
  chrome.runtime
    .getContexts({
      documentUrls: [
        path.startsWith(chrome.runtime.getURL('')) ? path : chrome.runtime.getURL(path),
      ],
    })
    .then(popupContexts => {
      if (popupContexts.length) {
        throw Error('Popup already open');
      }
    });

const throwIfNeedsLogin = async () => {
  const loggedIn = await sessionExtStorage.get('passwordKey');
  if (!loggedIn) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};

const spawnPopup = async (pop: PopupType, popupId: string) => {
  const popUrl = new URL(
    chrome.runtime.getURL(`popup.html?popupId=${encodeURIComponent(popupId)}`),
  );

  await throwIfNeedsLogin();

  switch (pop) {
    case PopupType.OriginApproval:
      popUrl.hash = PopupPath.ORIGIN_APPROVAL;
      return spawnDetachedPopup(popUrl.href);
    case PopupType.TxApproval:
      popUrl.hash = PopupPath.TRANSACTION_APPROVAL;
      return spawnDetachedPopup(popUrl.href);
    default:
      throw Error('Unknown popup type');
  }
};

const POPUP_READY_TIMEOUT = 60 * 1000;

const popupReady = async (popupId: string): Promise<void> => {
  return new Promise((resolve, reject): void => {
    setTimeout(() => {
      reject(new Error('Popup ready timed out'));
    }, POPUP_READY_TIMEOUT);

    const handlePopupReady = (res: PopupReadyResponse): void => {
      if (res.type === PopupType.Ready && res.data.popupId === popupId) {
        chrome.runtime.onMessage.removeListener(handlePopupReady);
        resolve();
      }
    };

    chrome.runtime.onMessage.addListener(handlePopupReady);
  });
};
