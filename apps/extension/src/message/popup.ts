import type { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import type { UserChoice } from '@penumbra-zone/types/user-choice';
import { OriginRecord } from '../storage/types';
import { JsonValue } from '@bufbuild/protobuf';

export enum PopupType {
  TxApproval = 'TxApproval',
  OriginApproval = 'OriginApproval',
}

export type PopupError = Record<'error', JsonValue>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PopupRequest<M extends PopupType = any> = { id: string } & Record<
  M,
  {
    TxApproval: { authorizeRequest: Jsonified<AuthorizeRequest> };
    OriginApproval: {
      origin: string;
      favIconUrl?: string;
      title?: string;
      lastRequest?: number;
    };
  }[M]
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PopupResponse<M extends PopupType = any> = Record<
  M,
  {
    TxApproval: {
      authorizeRequest: Jsonified<AuthorizeRequest>;
      choice: UserChoice;
    };
    OriginApproval: OriginRecord;
  }[M]
>;

export const isPopupRequest = (id: string, req: unknown): req is PopupRequest =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).length === 2 &&
  'id' in req &&
  req.id === id &&
  Object.keys(req).some(k => k in PopupType);

export const isPopupRequestType = <M extends PopupType>(
  req: unknown,
  pt: M,
): req is PopupRequest<M> =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).length === 2 &&
  'id' in req &&
  Object.keys(req).some(k => pt === k);

export const isPopupResponseType = <M extends PopupType>(
  res: unknown,
  pt: M,
): res is PopupResponse<M> =>
  typeof res === 'object' &&
  res !== null &&
  Object.keys(res).length === 1 &&
  pt === Object.keys(res)[0];
