/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import {
  InternalRequest,
  InternalRequestType,
  InternalResponse,
  isInternalRequest,
} from './internal';

export type InternalDialogRequest<D extends DialogRequestType> = {
  [InternalRequestType.Dialog]: DialogRequest<D>;
  id: string;
};

export type InternalDialogResponse<D extends DialogRequestType> =
  InternalResponse<InternalRequestType.Dialog> & { Dialog: DialogResponse<D> };

export enum DialogRequestType {
  AuthorizeTransaction = 'AuthorizeTransaction',
  ConnectDapp = 'ConnectDapp',
}

export type DialogRequest<D extends DialogRequestType> = {
  [k in D]: {
    AuthorizeTransaction: Jsonified<AuthorizeRequest>;
    ConnectDapp: {
      origin: string;
      favIconUrl?: string;
      title?: string;
      lastRequest?: number;
    };
  }[k];
};

export type DialogResponse<D extends DialogRequestType = DialogRequestType> = {
  AuthorizeTransaction: UserChoice;
  ConnectDapp: UserChoice;
}[D];

export const isInternalDialogRequest = (
  id: string,
  request: unknown,
): request is InternalRequest<InternalRequestType.Dialog> & { id: typeof id } =>
  isInternalRequest(InternalRequestType.Dialog, request) && request.id === id;

export const isDialogMessage = <D extends DialogRequestType>(
  dialogType: D,
  request: unknown,
): request is DialogRequest<D> =>
  typeof request === 'object' &&
  request !== null &&
  Object.keys(request).length === 1 &&
  dialogType in request;
