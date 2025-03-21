import { PopupPath } from './routes/popup/paths';
import { Code, ConnectError } from '@connectrpc/connect';
import { sessionExtStorage } from './storage/session';
import { PopupRequest, PopupResponse, PopupType } from './message/popup';
import { sendPopup } from './message/send-popup';
import { listenReady } from './message/listen-ready';

type PopupGeometry = Required<Pick<chrome.windows.CreateData, 'width' | 'height' | 'top' | 'left'>>;

const POPUP_READY_TIMEOUT = 60_000;
const POPUP_PATHS = {
  [PopupType.TxApproval]: PopupPath.TRANSACTION_APPROVAL,
  [PopupType.OriginApproval]: PopupPath.ORIGIN_APPROVAL,
} as const;
const POPUP_BASE = chrome.runtime.getURL('/popup.html');

/**
 * Launch a popup dialog to obtain a decision from the user. Returns the user
 * decision, or `null` if the popup is closed without interaction.
 */
export const popup = async <M extends PopupType>(
  popupType: M,
  request: PopupRequest<M>[M],
  parent?: chrome.windows.Window,
): Promise<PopupResponse<M>[M] | null> => {
  await throwIfNeedsLogin();
  await throwIfAlreadyOpen(popupType);

  const geometry: PopupGeometry = await Promise.resolve(
    parent ?? chrome.windows.getLastFocused(),
  ).then(({ top = 0, left = 0, width = 0 }) => ({
    width: 400,
    height: 628,
    // top right side of parent
    top: Math.max(0, top),
    left: Math.max(0, left + width - 400),
  }));

  const id = await spawnPopup(popupType, geometry);

  const popupRequest = { [popupType]: request, id } as PopupRequest<M>;
  const popupResponse = await sendPopup(popupRequest);

  if (popupResponse == null) {
    return null;
  } else {
    const { [popupType]: response } = popupResponse;
    return response;
  }
};

/**
 * The popup document uses a hash router. Each popup type has a unique path in
 * the router. The popup id is a query parameter and does not affect routing.
 */
const popupUrl = (popupType?: PopupType, id?: string): URL => {
  const pop = new URL(POPUP_BASE);

  if (popupType) {
    pop.hash = POPUP_PATHS[popupType];
  }

  if (id) {
    pop.searchParams.set('id', id);
  }

  return pop;
};

/** Throws if another popup of the same type already exists. */
const throwIfAlreadyOpen = async (popupType: PopupType) => {
  // every popup will have the same origin and pathname.
  // every popup will have a uuid in query parameters.
  // popups of the same type will have a matching hash.

  // url for comparison
  const check = popupUrl(popupType);

  const contextUrls = (
    await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.POPUP],
      // the documentUrls filter is not flexible enough, so use documentOrigins
      documentOrigins: [check.origin],
    })
  ).map(
    // parse for comparison
    ({ documentUrl }) => (documentUrl ? new URL(documentUrl) : undefined),
  );

  const popupMatch = contextUrls.find(
    open =>
      open &&
      // pathname identifies popup documents
      open.pathname === check.pathname &&
      // hash contains the popup router's path
      open.hash === check.hash,
    // don't do uuid comparison: open.search === pop.search
  );

  if (popupMatch) {
    throw new Error(`Popup ${popupType} already open`, { cause: popupMatch });
  }
};

/** Throws if the user is not logged in. */
const throwIfNeedsLogin = async () => {
  const loggedIn = await sessionExtStorage.get('passwordKey');
  if (!loggedIn) {
    throw new ConnectError('User must login to extension', Code.Unauthenticated);
  }
};

/**
 * Spawns a popup with a unique id, and resolves the ID when the popup is ready.
 * Ready promise times out in {@link POPUP_READY_TIMEOUT} milliseconds.
 */
const spawnPopup = async (popupType: PopupType, geometry: PopupGeometry): Promise<string> => {
  const id = crypto.randomUUID();
  const ready = listenReady(id, AbortSignal.timeout(POPUP_READY_TIMEOUT));
  await chrome.windows.create({
    url: popupUrl(popupType, id).href,
    type: 'popup',
    ...geometry,
  });
  return ready;
};
