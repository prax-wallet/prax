import {
  AuthorizeRequest,
  AuthorizeResponse,
} from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';

export const getActiveAuth = async () => {
  // TODO: retrieve from storage/config
  const activeMethods = new Set(['prax', 'ledger']);

  const methods = [];
  for (const methodName of activeMethods) {
    switch (methodName) {
      case 'prax':
        methods.push(import('../authorize/prax/auth'));
        break;
      case 'ledger':
        methods.push(import('../authorize/ledger/auth'));
        break;
      default:
        throw new Error('Unknown authorization method', { cause: methodName });
    }
  }

  return (await Promise.all(methods)).map(m => m.default);
};

export const getAuthorizationData = async ({
  plan,
  preAuthorizations,
}: AuthorizeRequest): Promise<AuthorizeResponse> => {
  if (!plan) {
    throw new Error('No plan');
  }

  if (preAuthorizations.length) {
    throw new Error('Unspported pre-authorization');
  }

  const authMethods = await getActiveAuth();

  const txAuths = await Promise.all(authMethods.map(auth => auth(plan)));

  const { effectHash } = txAuths.reduce((prev, curr) => {
    if (!curr.effectHash?.equals(prev.effectHash)) {
      throw new Error('Effect hashes mismatched', { cause: { prev, curr } });
    }
    return curr;
  });

  if (!effectHash?.inner.length) {
    throw new Error('Effect hash empty', { cause: txAuths });
  }

  return new AuthorizeResponse({
    data: {
      effectHash,
      spendAuths: txAuths.flatMap(({ spendAuths }) => spendAuths),
      delegatorVoteAuths: txAuths.flatMap(({ delegatorVoteAuths }) => delegatorVoteAuths),
      lqtVoteAuths: txAuths.flatMap(({ lqtVoteAuths }) => lqtVoteAuths),
    },
  });
};
