import { JsonValue } from '@bufbuild/protobuf';
import { DialogRequest, DialogResponse, DialogTypeName } from './internal-control/dialog';
import { ReadyRequest } from './internal-control/ready';
import { RevokeRequest } from './internal-control/revoke';
import { BlockProcessorRequest } from './internal-control/block-processor';

export type ControlTypeName = 'Dialog' | 'Ready' | 'Revoke' | 'BlockProcessor';
export type ControlRequestData<M extends ControlTypeName> = ControlRequestMap[M];
export type ControlResponseData<M extends ControlTypeName> = ControlResponseMap[M];

export type ControlFailure = Record<'error', JsonValue>;

export type ControlRequest<
  M extends ControlTypeName = ControlTypeName,
  D extends ControlRequestData<M> = ControlRequestData<M>,
> = Record<M, D> & { id?: string };

export type ControlResponse<
  M extends ControlTypeName = ControlTypeName,
  D extends ControlResponseData<M> = ControlResponseData<M>,
> = Record<M, D>;

export const isControlRequest = <
  T extends ControlTypeName,
  D extends ControlRequestData<T> = ControlRequestData<T>,
>(
  typeKey: T,
  request: unknown,
  id?: string,
): request is ControlRequest<T, D> =>
  typeof request === 'object' &&
  request !== null &&
  typeKey in request &&
  Object.keys(request).filter(k => k !== 'id').length === 1 &&
  (id ? 'id' in request && request.id === id : !('id' in request));

export const isControlResponse = <
  T extends ControlTypeName,
  D extends ControlResponseData<T> = ControlResponseData<T>,
>(
  typeKey: T,
  response: unknown,
): response is ControlResponse<T, D> =>
  typeof response === 'object' &&
  response !== null &&
  Object.keys(response).length === 1 &&
  typeKey in response;

export const asControlRequest = <T extends ControlTypeName, D extends ControlRequestData<T>>(
  typeKey: T,
  data: D,
  id?: string,
): ControlRequest<T, D> => {
  const request = { [typeKey]: data, ...(id ? { id } : {}) };
  if (isControlRequest<T, D>(typeKey, request, id)) {
    return request;
  }
  throw new TypeError(`Invalid ${typeKey} request`, { cause: request });
};

export const asControlResponse = <M extends ControlTypeName>(
  typeKey: M,
  data: ControlResponseData<M>,
): ControlResponse<M> => {
  const response = { [typeKey]: data };
  if (isControlResponse(typeKey, response)) {
    return response;
  }
  throw new TypeError(`Invalid ${typeKey} response`, { cause: response });
};

export const isControlFailure = (request: unknown): request is ControlFailure =>
  typeof request === 'object' &&
  request !== null &&
  Object.keys(request).length === 1 &&
  'error' in request;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- map
type ControlRequestMap = {
  Dialog: DialogRequest<unknown extends infer D extends DialogTypeName ? D : never>;
  Ready: ReadyRequest;
  Revoke: RevokeRequest;
  BlockProcessor: BlockProcessorRequest;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- map
type ControlResponseMap = {
  Dialog: DialogResponse<unknown extends infer D extends DialogTypeName ? D : never>;
  Ready: null;
  Revoke: null;
  BlockProcessor: null;
};
