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

export type PopupRequest<M extends PopupType> = Record<
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

export type PopupResponse<M extends PopupType> = Record<
  M,
  {
    TxApproval: {
      authorizeRequest: Jsonified<AuthorizeRequest>;
      choice: UserChoice;
    };
    OriginApproval: OriginRecord;
  }[M]
>;

export const isPopupRequest = <M extends PopupType>(
  req: unknown,
  pt?: M | undefined,
): req is PopupRequest<M> =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).length === 1 &&
  Object.keys(req).some(k => (pt != null ? pt === k : k in PopupType));

export const isPopupResponse = <M extends PopupType>(
  res: unknown,
  pt: M,
): res is PopupResponse<M> =>
  typeof res === 'object' &&
  res !== null &&
  Object.keys(res).length === 1 &&
  pt === Object.keys(res)[0];
