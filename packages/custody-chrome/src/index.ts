import { Code, ConnectError, type ServiceImpl } from '@connectrpc/connect';
import type { CustodyService } from '@penumbra-zone/protobuf';
import { authorizeCtx } from './ctx';

export const custodyImpl: Omit<
  ServiceImpl<typeof CustodyService>,
  | 'confirmAddress'
  | 'exportFullViewingKey'
  | 'authorizeValidatorVote'
  | 'authorizeValidatorDefinition'
> = {
  async authorize({ plan, preAuthorizations }, ctx) {
    const authorize = ctx.values.get(authorizeCtx);

    if (!plan) {
      throw new ConnectError('Plan is required', Code.InvalidArgument);
    }

    if (preAuthorizations.length > 0) {
      throw new ConnectError('Multiparty authorization is not supported', Code.Unimplemented);
    }

    return { data: await authorize(plan) };
  },
};
