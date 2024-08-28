import { sessionExtStorage } from './storage/session';
import { PopupMessage, PopupRequest, PopupType } from './message/popup';
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

  // this is necessary given it takes a bit of time for the popup
  // to be ready to accept messages from the service worker.
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

const spawnDetachedPopup = async (url: URL) => {
  await throwIfAlreadyOpen(url.pathname);

  const { top, left, width } = await chrome.windows.getLastFocused();

  await chrome.windows.create({
    url: url.href,
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
  const popUrl = new URL(chrome.runtime.getURL('popup.html'));

  await throwIfNeedsLogin();

  switch (pop) {
    case PopupType.OriginApproval:
      popUrl.hash = `${PopupPath.ORIGIN_APPROVAL}?popupId=${popupId}`;
      return spawnDetachedPopup(popUrl);
    case PopupType.TxApproval:
      popUrl.hash = `${PopupPath.TRANSACTION_APPROVAL}?popupId=${popupId}`;
      return spawnDetachedPopup(popUrl);
    default:
      throw Error('Unknown popup type');
  }
};

const POPUP_READY_TIMEOUT = 60 * 1000;

const popupReady = (popupId: string): Promise<void> =>
  new Promise((resolve, reject) => {
    AbortSignal.timeout(POPUP_READY_TIMEOUT).onabort = reject;

    const idListen = (msg: unknown, _: chrome.runtime.MessageSender, respond: () => void) => {
      if (msg === popupId) {
        resolve();
        chrome.runtime.onMessage.removeListener(idListen);
        respond();
      }
    };

    chrome.runtime.onMessage.addListener(idListen);
  });
