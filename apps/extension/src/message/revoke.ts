import { InternalRequest, InternalRequestType, isInternalRequest } from './internal';

export type RevokeRequest = string;
export const isInternalRevokeRequest = (
  request: unknown,
): request is InternalRequest<InternalRequestType.Revoke> => {
  if (
    isInternalRequest(InternalRequestType.Revoke, request) &&
    typeof request.Revoke === 'string'
  ) {
    try {
      const parse = new URL(request.Revoke);
      return parse.origin === request.Revoke;
    } catch (e) {
      console.warn('Invalid revoke request', request, e);
    }
  }
  return false;
};
