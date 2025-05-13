import { Code, ConnectError } from '@connectrpc/connect';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import { TransactionPlan } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { Box } from '@penumbra-zone/types/box';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { assertValidActionPlans } from './assert-valid-plan';
import { getFullViewingKey } from './full-viewing-key';

export const authorizeChrome = async (plan: TransactionPlan) => {
  const fvk = await getFullViewingKey();
  assertValidActionPlans(plan.actions, fvk);

  const passKeyJson = await sessionExtStorage.get('passwordKey');
  if (!passKeyJson) {
    throw new ConnectError('User must login', Code.Unauthenticated);
  }
  const passKey = await Key.fromJson(passKeyJson);

  const wallet0 = (await localExtStorage.get('wallets'))[0];
  if (!wallet0) {
    throw new ConnectError('No wallet found');
  }

  const seedBox = Box.fromJson(wallet0.custody.encryptedSeedPhrase);
  const seedPhrase = await passKey.unseal(seedBox);
  if (!seedPhrase) {
    throw new ConnectError('Unable to decrypt seed phrase', Code.Unauthenticated);
  }

  const sk = generateSpendKey(seedPhrase);

  return authorizePlan(sk, plan);
};
