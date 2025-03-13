import { InternalRequest, InternalRequestType, isInternalRequest } from './internal';

export enum DatabaseRequest {
  ClearCache = 'ClearCache',
  ChangeNumeraires = 'ChangeNumeraires',
}

export const isInternalDatabaseRequest = (
  request: unknown,
): request is InternalRequest<InternalRequestType.Database> =>
  isInternalRequest(InternalRequestType.Database, request) && typeof request.Database === 'string';
