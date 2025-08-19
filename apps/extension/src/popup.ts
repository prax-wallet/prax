import { PopupPath } from './routes/popup/paths';
import { PopupRequest, PopupResponse, PopupType } from './message/popup';
import { sendPopup } from './message/send-popup';
import { listenReady } from './message/listen-ready';
import { promptIfNeedsLogin } from './needs-login';

const POPUP_READY_TIMEOUT = 60_000;
const POPUP_PATHS = {
  [PopupType.TxApproval]: PopupPath.TRANSACTION_APPROVAL,
  [PopupType.OriginApproval]: PopupPath.ORIGIN_APPROVAL,
  [PopupType.LoginPrompt]: PopupPath.LOGIN_PROMPT,
} as const;
const POPUP_BASE = chrome.runtime.getURL('/popup.html');
const POPUP_SIZE_DETACHED = { width: 400, height: 628 };

/**
 * Launch a popup dialog to obtain a decision from the user. Returns the user
 * decision, or `null` if the popup is closed without interaction.
 */
export const popup = async <M extends PopupType>(
  popupType: M,
  request: Omit<PopupRequest<M>[M], 'sender'>,
  sender?: chrome.runtime.MessageSender,
): Promise<PopupResponse<M>[M] | null> => {
  if (popupType !== PopupType.LoginPrompt) {
    await promptIfNeedsLogin(popupType, sender);
  }

  const popupResponse = await navigator.locks.request(
    `${chrome.runtime.id}-popup-${popupType}`,
    { ifAvailable: true, mode: 'exclusive' },
    async lock => {
      if (!lock) {
        throw new Error(`Popup ${popupType} already open`);
      }

      const popupId = await spawnPopup(popupType, sender);

      const popupRequest = {
        [popupType]: request,
        id: popupId,
        sender,
      } as PopupRequest<M>;

      return sendPopup(popupRequest);
    },
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

/**
 * Spawns a popup with a unique id, and resolves the ID when the popup is ready.
 *
 * If a relevant sender with a tab id is provided, the popup is an attached
 * action popup. Otherwise, a detached popup appears near the last focused
 * window.
 *
 * @todo when sender is available in service context, rm detached popups
 *
 * Ready promise times out in {@link POPUP_READY_TIMEOUT} milliseconds.
 */
const spawnPopup = async (
  popupType: PopupType,
  sender?: chrome.runtime.MessageSender,
): Promise<string> => {
  const popupId = crypto.randomUUID();
  const ready = listenReady(popupId, AbortSignal.timeout(POPUP_READY_TIMEOUT));

  if (sender?.tab) {
    // Spawn an attached popup on the relevant tab.
    await chrome.action.setPopup({
      tabId: sender.tab.id,
      popup: popupUrl(popupType, popupId).href,
    });
    await chrome.action.openPopup({
      windowId: sender.tab.windowId,
    });
  } else {
    // Spawn a detached popup near the last focused window, which is hopefully relevant.
    const geometry = await chrome.windows
      .getLastFocused()
      .then(({ top = 0, left = 0, width = 0 }) => ({
        // top right side of parent
        top: Math.max(0, top),
        left: Math.max(0, left + width - POPUP_SIZE_DETACHED.width),
        ...POPUP_SIZE_DETACHED,
      }));

    const created = await chrome.windows.create({
      url: popupUrl(popupType, popupId).href,
      type: 'popup',
      ...geometry,
    });

    // window id is guaranteed present after `create`
    void ready.catch(() => chrome.windows.remove(created.id!));
  }

  return ready;
};
