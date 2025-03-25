import { PopupRequest, PopupResponse, PopupType, typeOfPopupRequest } from './popup';
import { suppressChromeResponderDroppedError } from '../utils/chrome-errors';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';
import { ConnectError } from '@connectrpc/connect';
import { JsonValue } from '@bufbuild/protobuf';

/**
 * Send a configuration message to a uniquely identified popup, and await
 * response. Resolves `null` if the popup is closed.
 */
export const sendPopup = async <M extends PopupType>(
  popupRequest: PopupRequest<M>,
): Promise<PopupResponse<M> | null> => {
  const popupResponse = await chrome.runtime
    .sendMessage<PopupRequest<M>, PopupResponse<M>>(popupRequest)
    .catch(suppressChromeResponderDroppedError);

  if (popupResponse == null) {
    return null;
  } else if ('error' in popupResponse) {
    throw errorFromJson(
      popupResponse.error as JsonValue,
      undefined,
      ConnectError.from('Popup failed'),
    );
  } else if (typeOfPopupRequest(popupRequest) in popupResponse) {
    return popupResponse;
  } else {
    throw new TypeError('Invalid response to popup', {
      cause: { popupRequest, popupResponse },
    });
  }
};
