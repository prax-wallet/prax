/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { JsonValue } from '@bufbuild/protobuf';
import { DialogRequest, DialogResponse } from './popup';
import { DatabaseRequest } from './services';
import { ReadyRequest } from './ready';
import { RevokeRequest } from './revoke';

export enum InternalRequestType {
  Dialog = 'Dialog',
  Ready = 'Ready',
  Revoke = 'Revoke',
  Database = 'Database',
}

export type InternalRequest<M extends InternalRequestType> = { id?: string } & {
  [k in M]: InternalRequestData<k>;
};
export type InternalResponse<M extends InternalRequestType> = {
  [k in M]: InternalResponseData<k>;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InternalFailure = { error: JsonValue };

export type InternalRequestData<M extends InternalRequestType> = {
  Dialog: DialogRequest<never>;
  Ready: ReadyRequest;
  Revoke: RevokeRequest;
  Database: DatabaseRequest;
}[M];

export type InternalResponseData<M extends InternalRequestType> = {
  Dialog: DialogResponse;
  Ready: null;
  Revoke: null;
  Database: null;
}[M];

export const isInternalRequest = <M extends InternalRequestType>(
  requestType: M,
  request: unknown,
): request is InternalRequest<M> =>
  typeof request === 'object' &&
  request !== null &&
  //Object.keys(request).length === 1 &&
  requestType in request;

export const isInternalResponse = <M extends InternalRequestType>(
  responseType: M,
  response: unknown,
): response is InternalResponse<M> =>
  typeof response === 'object' &&
  response !== null &&
  Object.keys(response).length === 1 &&
  responseType in response;

export const isInternalFailure = (request: unknown): request is InternalFailure =>
  typeof request === 'object' &&
  request !== null &&
  Object.keys(request).length === 1 &&
  'error' in request;
