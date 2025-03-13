import {
  InternalRequestType,
  InternalFailure,
  InternalResponse,
  InternalRequest,
} from './message/internal';
import { isInternalReadyRequest } from './message/ready';
import { isDialogMessage } from './message/popup';
import { DialogRequest, DialogRequestType, DialogResponse } from './message/popup';
import { PopupPath } from './routes/popup/paths';
import { Code, ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import { isInternalSender } from './senders/internal';
import { sessionExtStorage } from './storage/session';
import { postDialog } from './post-internal';

const POPUP_READY_TIMEOUT = 60 * 1000;

const popupHtml = chrome.runtime.getURL('/popup.html');

const dialogPath: Record<DialogRequestType, PopupPath> = {
  [DialogRequestType.AuthorizeTransaction]: PopupPath.TRANSACTION_APPROVAL,
  [DialogRequestType.ConnectDapp]: PopupPath.ORIGIN_APPROVAL,
};

const popupGeometry = (parent?: chrome.windows.Window) => ({
  width: 400,
  height: 628,

  top: parent?.top,
  left:
    parent?.left != null && parent.width != null
      ? Math.max(0, parent.left + (parent.width - 400))
      : undefined,
});

const spawnDetachedPopup = async (parent: chrome.windows.Window, url: URL): Promise<string> => {
  console.debug('spawnDetachedPopup', url);
  type SendResponse = (r: InternalResponse<InternalRequestType.Ready> | InternalFailure) => void;

  const id = crypto.randomUUID();

  const { promise: ready, resolve, reject } = Promise.withResolvers<typeof id>();

  const handleReady = (
    msg: InternalRequest<InternalRequestType.Ready>,
    sender: chrome.runtime.MessageSender,
    respond: SendResponse,
  ) => {
    if (isInternalSender(sender) && isInternalReadyRequest(id, msg)) {
      try {
        respond({ Ready: null });
        resolve(id);
      } catch (e) {
        respond({ error: errorToJson(ConnectError.from(e), undefined) });
        reject(e);
      }
      return true;
    }
    return false;
  };

  void ready.finally(() => chrome.runtime.onMessage.removeListener(handleReady));
  chrome.runtime.onMessage.addListener(handleReady);
  AbortSignal.timeout(POPUP_READY_TIMEOUT).onabort = reject;

  url.searchParams.set('id', id);

  await chrome.windows.create({
    url: url.href,
    type: 'popup',
    ...popupGeometry(parent),
  });

  return ready;
};

const throwIfAlreadyOpen = async (dialog: DialogRequestType) => {
  const contexts = (
    await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.POPUP] })
  ).filter(c => c.documentUrl?.startsWith(popupHtml) && c.documentUrl.includes(dialogPath[dialog]));

  for (const ctx of contexts) {
    if (ctx.documentUrl) {
      const ctxUrl = new URL(ctx.documentUrl);
      if (ctxUrl.hash.includes(dialogPath[dialog])) {
        throw new Error('Popup already open');
      }
    }
  }
};

const throwIfNeedsLogin = async () => {
  const loggedIn = await sessionExtStorage.get('passwordKey');
  if (!loggedIn) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};

const spawnDialog = async (
  window: chrome.windows.Window,
  dialog: DialogRequestType,
): Promise<string> => {
  console.debug('spawnDialog', window, dialog);
  await throwIfNeedsLogin();
  await throwIfAlreadyOpen(dialog);

  const url = new URL(popupHtml);
  url.hash = dialogPath[dialog];

  return spawnDetachedPopup(window, url);
};

/** Opens a popup dialog to obtain a user response. */
export const popup = async <M extends DialogRequestType>(
  window: chrome.windows.Window,
  dialogType: M,
  requestData: DialogRequest<M>[M],
): Promise<DialogResponse<M> | null> => {
  console.debug('popup', window, dialogType, requestData);
  const dialogRequest = { [dialogType]: requestData };

  if (!isDialogMessage(dialogType, dialogRequest)) {
    throw new TypeError('Invalid dialog request', { cause: dialogRequest });
  }

  return postDialog(await spawnDialog(window, dialogType), dialogRequest);
};
