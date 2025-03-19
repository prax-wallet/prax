import { PopupPath } from './routes/popup/paths';
import { Code, ConnectError } from '@connectrpc/connect';
import { sessionExtStorage } from './storage/session';
import { PopupRequest, PopupResponse, isPopupResponseType, PopupType } from './message/popup';
import { listenReady, sendPopup } from './message/send-popup';

const popupHtml = chrome.runtime.getURL('/popup.html');

const popupPath: Record<PopupType, PopupPath> = {
  TxApproval: PopupPath.TRANSACTION_APPROVAL,
  OriginApproval: PopupPath.ORIGIN_APPROVAL,
};

export const popup = async <M extends PopupType>(
  dialogType: M,
  request: PopupRequest<M>[M],
): Promise<PopupResponse<M>[M] | null> => {
  const id = await spawnPopup(dialogType);
  const response = await sendPopup(id, dialogType, request);

  if (response == null) {
    return null;
  } else if (isPopupResponseType(response, dialogType)) {
    return response[dialogType];
  } else {
    throw new TypeError('Invalid popup response', { cause: { request, response } });
  }
};

const spawnDetachedPopup = async (url: URL): Promise<string> => {
  const { promise: ready, resolve, reject } = Promise.withResolvers<string>();

  const id = crypto.randomUUID();
  url.searchParams.set('id', id);

  const listener = listenReady(id, { resolve, reject });
  chrome.runtime.onMessage.addListener(listener);
  void ready.finally(() => chrome.runtime.onMessage.removeListener(listener));

  const { top, left, width } = await chrome.windows.getLastFocused();
  await chrome.windows.create({
    url: url.href,
    type: 'popup',
    top,
    // press the window to the right side of screen
    left: left !== undefined && width !== undefined ? left + (width - 400) : 0,
  });

  return ready;
};

const throwIfAlreadyOpen = async (dialog: PopupType) => {
  const contexts = (
    await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.POPUP] })
  ).filter(c => c.documentUrl?.startsWith(popupHtml) && c.documentUrl.includes(popupPath[dialog]));

  for (const ctx of contexts) {
    if (ctx.documentUrl) {
      const ctxUrl = new URL(ctx.documentUrl);
      if (ctxUrl.hash.includes(popupPath[dialog])) {
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

const spawnPopup = async (dialog: PopupType): Promise<string> => {
  await throwIfNeedsLogin();
  await throwIfAlreadyOpen(dialog);

  const url = new URL(popupHtml);
  url.hash = popupPath[dialog];

  return spawnDetachedPopup(url);
};
