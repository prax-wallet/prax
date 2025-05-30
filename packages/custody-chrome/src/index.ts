import type { ServiceImpl } from '@connectrpc/connect';
import type { CustodyService } from '@penumbra-zone/protobuf';
import { authorize } from './authorize.js';

declare global {
  // eslint-disable-next-line no-var -- expected globals
  var __DEV__: boolean | undefined;
}

export const custodyImpl: Omit<
  ServiceImpl<typeof CustodyService>,
  | 'confirmAddress'
  | 'exportFullViewingKey'
  | 'authorizeValidatorVote'
  | 'authorizeValidatorDefinition'
> = {
  authorize,
};
