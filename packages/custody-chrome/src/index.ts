import { Code, ConnectError, type ServiceImpl } from '@connectrpc/connect';
import type { CustodyService } from '@penumbra-zone/protobuf';
import { approveCtx } from './ctx/approve';
import { authorizeCtx } from './ctx/authorize';
import { UserChoice } from '@penumbra-zone/types/user-choice';

declare global {
  // eslint-disable-next-line no-var -- expected globals
  var __DEV__: boolean | undefined;
}

export type Impl = ServiceImpl<typeof CustodyService>;

export const custodyImpl: Omit<
  Impl,
  | 'confirmAddress'
  | 'exportFullViewingKey'
  | 'authorizeValidatorVote'
  | 'authorizeValidatorDefinition'
> = {
  async authorize({ plan }, ctx) {
    if (!plan) {
      throw new ConnectError('Plan is required', Code.InvalidArgument);
    }

    const approval = ctx.values.get(approveCtx)(plan);
    const authorization = ctx.values.get(authorizeCtx)(plan);

    if ((await approval) !== UserChoice.Approved) {
      throw new ConnectError('Transaction not approved', Code.PermissionDenied);
    }

    try {
      return {
        data: await authorization,
      };
    } catch (e) {
      // failures may be sensitive, so don't forward to caller unless in dev mode
      if (globalThis.__DEV__) {
        throw ConnectError.from(e);
      }
      console.error('Failed to authorize transaction', e);
      throw ConnectError.from('Failed to authorize transaction', Code.Internal);
    }
  },
};
