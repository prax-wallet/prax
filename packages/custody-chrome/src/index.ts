import { Code, ConnectError, type ServiceImpl } from '@connectrpc/connect';
import type { CustodyService } from '@penumbra-zone/protobuf';
import { assertValidActionPlans } from '@penumbra-zone/services/validation/plan-validation';
import { approveCtx } from './ctx/approve';
import { authorizeCtx } from './ctx/authorize';
import { fvkCtx } from '@penumbra-zone/services/ctx/full-viewing-key';
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
    assertValidActionPlans(plan?.actions, await ctx.values.get(fvkCtx)());

    const authorization = ctx.values.get(authorizeCtx)(plan);
    const approval = ctx.values.get(approveCtx)(plan);

    if ((await approval) === UserChoice.Approved) {
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
    } else {
      throw new ConnectError('Transaction not approved', Code.PermissionDenied);
    }
  },
};
