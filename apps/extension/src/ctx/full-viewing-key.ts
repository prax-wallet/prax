import { Code, ConnectError } from '@connectrpc/connect';
import { fullViewingKeyFromBech32m } from '@penumbra-zone/bech32m/penumbrafullviewingkey';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { localExtStorage } from '../storage/local';

export const getFullViewingKey = async () => {
  const wallet0 = (await localExtStorage.get('wallets'))[0];
  if (!wallet0) {
    throw new ConnectError('No wallet available', Code.FailedPrecondition);
  }

  return new FullViewingKey(fullViewingKeyFromBech32m(wallet0.fullViewingKey));
};
