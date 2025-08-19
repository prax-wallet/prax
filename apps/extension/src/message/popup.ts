import type { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import type { OriginRecord, UserChoice } from '@repo/storage-chrome/records';
import type { JsonValue } from '@bufbuild/protobuf';

const REQUEST_KEYS = ['id', 'sender'];

export enum PopupType {
  TxApproval = 'TxApproval',
  OriginApproval = 'OriginApproval',
  LoginPrompt = 'LoginPrompt',
}

export type PopupError = Record<'error', JsonValue>;

export type PopupRequest<M extends PopupType> = {
  id: string;
  sender?: chrome.runtime.MessageSender;
} & Record<M, PopupRequestMap[M]>;

export type PopupResponse<M extends PopupType> = Record<M, PopupResponseMap[M]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- doesn't narrow the parameter
export const isPopupRequest = (id: string, req: unknown): req is PopupRequest<any> =>
  typeof req === 'object' &&
  req !== null &&
  'id' in req &&
  req.id === id &&
  Object.keys(req).some(k => k in PopupType);

export const isPopupRequestType = <M extends PopupType>(
  pt: M,
  req: unknown,
): req is PopupRequest<M> =>
  typeof req === 'object' &&
  req !== null &&
  Object.keys(req).every(k => REQUEST_KEYS.includes(k) || k === pt);

export const isPopupResponseType = <M extends PopupType>(
  pt: M,
  res: unknown,
): res is PopupResponse<M> =>
  typeof res === 'object' &&
  res !== null &&
  Object.keys(res).every(k => !REQUEST_KEYS.includes(k) && k === pt);

export const typeOfPopupRequest = <M extends PopupType>(req: PopupRequest<M>): M => {
  const [key, ...extra] = Object.keys(req).filter(k => !REQUEST_KEYS.includes(k));
  if (!extra.length && key && key in PopupType) {
    return key as M;
  }
  throw new TypeError('Unknown popup type', { cause: { req } });
};

interface PopupRequestMap {
  LoginPrompt: { next: Exclude<PopupType, PopupType.LoginPrompt> };
  TxApproval: { authorizeRequest: Jsonified<AuthorizeRequest> };
  OriginApproval: { lastRequest?: number };
}

interface PopupResponseMap {
  LoginPrompt: { didLogin: boolean };
  TxApproval: {
    authorizeRequest: Jsonified<AuthorizeRequest>;
    choice: UserChoice;
  };
  OriginApproval: OriginRecord;
}
