import { sessionExtStorage } from './storage/session';
import { DialogRequest, DialogResponse, DialogTypeName } from './message/internal-control/dialog';
import { PopupPath } from './routes/popup/paths';
import { ControlRequest, ControlResponse, ControlFailure } from './message/control';
import { Code, ConnectError } from '@connectrpc/connect';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';
import { suppressChromeResponderDroppedError } from './utils/chrome-errors';

export const popup = async <D extends DialogTypeName>(
  Dialog: DialogRequest<D>,
): Promise<DialogResponse<D> | null> => {
  const popupId = crypto.randomUUID();
  const dialogType = Object.keys(Dialog)[0] as D;
  await spawnPopup(dialogType, popupId);

  // this is necessary given it takes a bit of time for the popup
  // to be ready to accept messages from the service worker.
  await popupReady(popupId);

  const response = await chrome.runtime
    .sendMessage<
      ControlRequest<'Dialog', DialogRequest<D>>,
      ControlResponse<'Dialog', DialogResponse<D>> | ControlFailure
    >({ Dialog })
    .catch(suppressChromeResponderDroppedError);

  if (response && 'error' in response) {
    throw errorFromJson(response.error, undefined, ConnectError.from(response));
  } else {
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    return response && response.Dialog;
  }
};

const spawnDetachedPopup = async (url: URL) => {
  const [hashPath] = url.hash.split('?');
  await throwIfAlreadyOpen(hashPath!);

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

const spawnPopup = async (pop: DialogTypeName, popupId: string) => {
  const popUrl = new URL(chrome.runtime.getURL('popup.html'));
  await throwIfNeedsLogin();

  switch (pop) {
    // set path as hash since we use a hash router within the popup
    case 'ApproveOrigin':
      popUrl.hash = `${PopupPath.ORIGIN_APPROVAL}?popupId=${popupId}`;
      return spawnDetachedPopup(popUrl);
    case 'AuthorizeTransaction':
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
