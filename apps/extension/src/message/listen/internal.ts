import { ConnectError } from '@connectrpc/connect';
import { errorToJson } from '@connectrpc/connect/protocol-connect';
import {
  asControlResponse,
  ControlFailure,
  ControlRequest,
  ControlRequestData,
  ControlResponse,
  ControlResponseData,
  ControlTypeName,
  isControlRequest,
} from '../control';
import { isInternalSender } from '../../senders/internal';

type ControlResponder<R extends ControlTypeName> = (r: ControlResponse<R> | ControlFailure) => void;

type ControlListener<R extends ControlTypeName> = (
  m: unknown,
  s: chrome.runtime.MessageSender,
  r: ControlResponder<R>,
) => boolean;

type ControlFilter<R extends ControlTypeName> = (
  r: ControlRequest<R>,
  s: chrome.runtime.MessageSender,
) => boolean;

export const listenInternal = <R extends ControlTypeName>(
  requestType: R,
  handle: (r: ControlRequestData<R>) => ControlResponseData<R> | Promise<ControlResponseData<R>>,
  filter?: string | ControlFilter<R>,
): ControlListener<R> => {
  const listener: ControlListener<R> = (msg, sender, respond): boolean => {
    const acceptId = typeof filter === 'string' ? filter : undefined;
    const acceptFn = typeof filter === 'function' ? filter : undefined;
    if (
      isInternalSender(sender) &&
      isControlRequest(requestType, msg, acceptId) &&
      (!acceptFn || acceptFn(msg, sender))
    ) {
      const { [requestType]: request } = msg;
      void Promise.resolve(request)
        .then(handle)
        .then(
          response => respond(asControlResponse(requestType, response)),
          failed => respond({ error: errorToJson(ConnectError.from(failed), undefined) }),
        );
      return true;
    }
    return false;
  };

  return listener;
};
