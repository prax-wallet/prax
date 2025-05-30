import { PopupPath } from './routes/popup/paths';
import { Code, ConnectError } from '@connectrpc/connect';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { PopupRequest, PopupResponse, PopupType } from './message/popup';
import { sendPopup } from './message/send-popup';
import { listenReady } from './message/listen-ready';

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
): Promise<PopupResponse<M>[M] | null> => {
  await throwIfNeedsLogin();

  const lockGranted = (async lock => {
    if (!lock) {
      throw new Error(`Popup ${popupType} already open`);
    }

    const popupId = await spawnDetachedPopup(popupType).catch(cause => {
      throw new Error(`Popup ${popupType} failed to open`, { cause });
    });

    const popupRequest = {
      [popupType]: request,
      id: popupId,
    } as PopupRequest<M>;

    return sendPopup(popupRequest);
  }) satisfies LockGrantedCallback;

  const popupResponse = await navigator.locks.request(
    popupType,
    { ifAvailable: true, mode: 'exclusive' },
    lockGranted,
  );

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
const spawnDetachedPopup = async (popupType: PopupType): Promise<string> => {
  const popupId = crypto.randomUUID();
  const ready = listenReady(popupId, AbortSignal.timeout(POPUP_READY_TIMEOUT));

  const geometry = await chrome.windows
    .getLastFocused()
    .then(({ top = 0, left = 0, width = 0 }) => ({
      width: 400,
      height: 628,
      // top right side of parent
      top: Math.max(0, top),
      left: Math.max(0, left + width - 400),
    }));

  const created = await chrome.windows.create({
    url: popupUrl(popupType, popupId).href,
    type: 'popup',
    ...geometry,
  });

  // window id is guaranteed present after `create`
  void ready.catch(() => chrome.windows.remove(created.id!));

  return ready;
};
