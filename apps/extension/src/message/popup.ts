import type {
  AuthorizeRequest,
  AuthorizeResponse,
} from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import type { OriginRecord } from '@repo/storage-chrome/records';
import type { JsonValue } from '@bufbuild/protobuf';

export enum PopupType {
  TxApproval = 'TxApproval',
  OriginApproval = 'OriginApproval',
}

export type PopupError = Record<'error', JsonValue>;

export type PopupRequest<M extends PopupType> = { id: string } & Record<M, PopupRequestMap[M]>;

export type PopupResponse<M extends PopupType> = Record<M, PopupResponseMap[M]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- doesn't narrow the parameter
export const isPopupRequest = (id: string, req: unknown): req is PopupRequest<any> =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).length === 2 &&
  'id' in req &&
  req.id === id &&
  Object.keys(req).some(k => k in PopupType);

export const isPopupRequestType = <M extends PopupType>(
  pt: M,
  req: unknown,
): req is PopupRequest<M> =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).length === 2 &&
  'id' in req &&
  Object.keys(req).some(k => pt === k);

export const isPopupResponseType = <M extends PopupType>(
  pt: M,
  res: unknown,
): res is PopupResponse<M> =>
  typeof res === 'object' &&
  res !== null &&
  Object.keys(res).length === 1 &&
  pt === Object.keys(res)[0];

export const typeOfPopupRequest = <M extends PopupType>(req: PopupRequest<M>): M => {
  const [key, ...extra] = Object.keys(req).filter(k => k !== 'id');
  if (!extra.length && key && key in PopupType) {
    return key as M;
  }
  throw new TypeError('Unknown popup type', { cause: { req } });
};

interface PopupRequestMap {
  TxApproval: { authorizeRequest: Jsonified<AuthorizeRequest> };
  OriginApproval: {
    origin: string;
    favIconUrl?: string;
    title?: string;
    lastRequest?: number;
  };
}

interface PopupResponseMap {
  TxApproval: { authorizeResponse: Jsonified<AuthorizeResponse> };
  OriginApproval: OriginRecord;
}
