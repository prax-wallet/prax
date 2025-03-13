import { InternalRequest, InternalRequestType, isInternalRequest } from './internal';

export type ReadyRequest = string;

export const isInternalReadyRequest = (
  id: string,
  request: unknown,
): request is InternalRequest<InternalRequestType.Ready> & { Ready: typeof id } =>
  isInternalRequest(InternalRequestType.Ready, request) && request.Ready === id;
