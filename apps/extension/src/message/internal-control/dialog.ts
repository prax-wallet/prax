import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';

export type DialogTypeName = 'AuthorizeTransaction' | 'ApproveOrigin';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- asdf
type DialogRequestMap = {
  AuthorizeTransaction: Jsonified<AuthorizeRequest>;
  ApproveOrigin: {
    origin: string;
    favIconUrl?: string;
    title?: string;
    lastRequest?: number;
  };
};

type DialogResponseMap = Record<DialogTypeName, unknown> & {
  AuthorizeTransaction: UserChoice;
  ApproveOrigin: UserChoice;
};

export type DialogRequestData<D extends DialogTypeName> = DialogRequestMap[D];
export type DialogResponseData<D extends DialogTypeName> = DialogResponseMap[D];

export type DialogRequest<D extends DialogTypeName> = Record<D, DialogRequestMap[D]>;
export type DialogResponse<D extends DialogTypeName> = Record<D, DialogResponseMap[D]>;

export const isDialogRequest = <D extends DialogTypeName>(
  dialogType: D,
  request: unknown,
): request is DialogRequest<D> =>
  typeof request === 'object' &&
  request !== null &&
  Object.keys(request).length === 1 &&
  dialogType in request;
