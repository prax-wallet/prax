import { JsonValue } from '@bufbuild/protobuf';
import { DialogRequest, DialogResponse, DialogTypeName } from './internal-control/dialog';
import { RevokeRequest } from './internal-control/revoke';
import { BlockProcessorRequest } from './internal-control/block-processor';

export type ControlTypeName = 'Dialog' | 'Revoke' | 'BlockProcessor';
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- map
type ControlRequestMap = {
  Dialog: DialogRequest<unknown extends infer D extends DialogTypeName ? D : never>;
  Revoke: RevokeRequest;
  BlockProcessor: BlockProcessorRequest;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- map
type ControlResponseMap = {
  Dialog: DialogResponse<unknown extends infer D extends DialogTypeName ? D : never>;
  Revoke: null;
  BlockProcessor: null;
};
