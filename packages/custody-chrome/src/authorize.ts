import { Code, ConnectError, type ServiceImpl } from '@connectrpc/connect';
import type { CustodyService } from '@penumbra-zone/protobuf';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { approveCtx } from './ctx/approve';
import { authorizeCtx } from './ctx/authorize';

export const authorize: ServiceImpl<typeof CustodyService>['authorize'] = async ({ plan }, ctx) => {
  if (!plan) {
    throw new ConnectError('Plan is required', Code.InvalidArgument);
  }

  // begin authorization promise
  const authorization = ctx.values
    .get(authorizeCtx)(plan)
    .catch((failure: unknown) => {
      console.error(failure);
      // don't propagate context failure unless in dev mode
      throw globalThis.__DEV__
        ? ConnectError.from(failure)
        : new ConnectError('Authorization failed', Code.Internal);
    });

  // begin approval promise
  const approval = ctx.values
    .get(approveCtx)(plan)
    .catch((failure: unknown) => {
      console.error(failure);
      // don't propagate context failure unless in dev mode
      throw globalThis.__DEV__
        ? ConnectError.from(failure)
        : new ConnectError('Approval failed', Code.Internal);
    });

  // await in parallel to throw earliest failure
  await Promise.all([
    approval.then(
      choice =>
        // reject if not approved
        choice === UserChoice.Approved ||
        Promise.reject(new ConnectError('Transaction not approved', Code.PermissionDenied)),
    ),
    authorization,
  ]);

  return { data: await authorization };
};
