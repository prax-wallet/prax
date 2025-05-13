import { WalletId } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { Code, ConnectError } from '@connectrpc/connect';
import { localExtStorage } from '@repo/storage-chrome/local';

export const getWalletId = async () => {
  const wallet0 = (await localExtStorage.get('wallets'))[0];
  if (!wallet0) {
    throw new ConnectError('No wallet available', Code.FailedPrecondition);
  }

  return WalletId.fromJsonString(wallet0.id);
};
