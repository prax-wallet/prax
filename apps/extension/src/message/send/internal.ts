import { Code, ConnectError } from '@connectrpc/connect';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';
import {
  asControlRequest,
  ControlRequestData,
  ControlResponseData,
  ControlTypeName,
  isControlFailure,
  isControlResponse,
} from '../control';

export const sendInternal = async <
  T extends ControlTypeName,
  D extends ControlRequestData<T>,
  R extends ControlResponseData<T>,
>(
  requestType: T,
  data: D,
  id?: string,
): Promise<R> => {
  const request = asControlRequest<T, D>(requestType, data, id);
  const response: unknown = await chrome.runtime.sendMessage(request);

  if (isControlFailure(response)) {
    throw errorFromJson(
      response.error,
      undefined,
      ConnectError.from('Failed to handle internal message', Code.Internal),
    );
  }

  if (isControlResponse<T, R>(requestType, response)) {
    return response[requestType] as R;
  }

  throw new Error('Invalid response format', { cause: response });
};
