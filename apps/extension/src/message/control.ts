import { JsonValue } from '@bufbuild/protobuf';
import { RevokeRequest } from './internal-control/revoke';
import { BlockProcessorRequest } from './internal-control/block-processor';

export type ControlTypeName = 'Revoke' | 'BlockProcessor';
export type ControlRequestData<M extends ControlTypeName> = ControlRequestMap[M];

export type ControlFailure = Record<'error', JsonValue>;

export type ControlRequest<
  M extends ControlTypeName = ControlTypeName,
  D extends ControlRequestData<M> = ControlRequestData<M>,
> = Record<M, D> & { id?: string };

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
  Revoke: RevokeRequest;
  BlockProcessor: BlockProcessorRequest;
};
