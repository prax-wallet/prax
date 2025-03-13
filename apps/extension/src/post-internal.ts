import { Code, ConnectError } from '@connectrpc/connect';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';
import {
  InternalFailure,
  InternalRequest,
  InternalRequestData,
  InternalRequestType,
  InternalResponse,
  isInternalFailure,
  isInternalRequest,
  isInternalResponse,
} from './message/internal';
import {
  DialogRequest,
  DialogRequestType,
  DialogResponse,
  InternalDialogRequest,
  InternalDialogResponse,
} from './message/popup';
import { suppressChromeResponderDroppedError } from './utils/chrome-errors';

export const postInternal = async <T extends InternalRequestType>(
  requestType: T,
  data: InternalRequestData<T>,
) => {
  console.debug('postInternal', requestType, data);
  const request = { [requestType]: data };

  if (!isInternalRequest(requestType, request)) {
    throw new TypeError('Invalid request', { cause: { type: requestType, request } });
  }

  const response = await chrome.runtime.sendMessage<
    InternalRequest<T>,
    InternalResponse<T> | InternalFailure
  >(request);

  if (isInternalFailure(response)) {
    throw errorFromJson(
      response.error,
      undefined,
      ConnectError.from('Failed to handle internal message', Code.Internal),
    );
  } else if (isInternalResponse(requestType, response)) {
    return response;
  } else {
    throw new TypeError('Invalid response', { cause: { type: requestType, response } });
  }
};

export const postDialog = async <M extends DialogRequestType>(
  id: string,
  Dialog: DialogRequest<M>,
): Promise<DialogResponse<M> | null> => {
  const response = await chrome.runtime
    .sendMessage<
      InternalDialogRequest<M>,
      InternalDialogResponse<M> | InternalFailure
    >({ id, Dialog })
    .catch(suppressChromeResponderDroppedError);

  if (response == null) {
    return null;
  } else if ('error' in response) {
    throw errorFromJson(response.error, undefined, ConnectError.from('Dialog failure'));
  } else if (InternalRequestType.Dialog in response) {
    return response[InternalRequestType.Dialog];
  } else {
    throw new TypeError('Unknown dialog response', { cause: response });
  }
};
