import { ConnectError, Code } from '@connectrpc/connect';
import { Key } from '@penumbra-zone/crypto-web/encryption';
import {
  TransactionPlan,
  AuthorizationData,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { Box } from '@penumbra-zone/types/box';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { UserChoice } from '@penumbra-zone/types/user-choice';
import { authorizePlan } from '@penumbra-zone/wasm/build';
import { generateSpendKey } from '@penumbra-zone/wasm/keys';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { PopupType } from '../message/popup';
import { popup } from '../popup';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { throwIfNeedsLogin } from '../needs-login';

export const getAuthorization = async (plan: TransactionPlan): Promise<AuthorizationData> => {
  await throwIfNeedsLogin();

  const authorization = unsealSpendKey().then(sk => authorizePlan(sk, plan));

  const approval = popup(PopupType.TxApproval, {
    authorizeRequest: new AuthorizeRequest({ plan }).toJson() as Jsonified<AuthorizeRequest>,
  });

  const [authorizationData] = await Promise.all([
    authorization.catch(error => {
      console.error(error);
      throw new ConnectError('Authorization failed', Code.Internal);
    }),
    approval.then(
      response => {
        if (response?.choice !== UserChoice.Approved) {
          throw new ConnectError('Authorization denied', Code.PermissionDenied);
        }
      },
      error => {
        console.error(error);
        throw new ConnectError('Authorization failed', Code.Internal);
      },
    ),
  ]);

  return authorizationData;
};

const unsealSpendKey = async () => {
  const getPassKey = sessionExtStorage
    .get('passwordKey')
    .then(passKeyJson => Key.fromJson(passKeyJson!));

  const getSeedBox = localExtStorage
    .get('wallets')
    .then(([wallet0]) => Box.fromJson(wallet0!.custody.encryptedSeedPhrase));

  const [passKey, seedBox] = await Promise.all([
    getPassKey.catch(error => {
      console.error(error);
      throw new ConnectError('Unable to read passkey', Code.Internal);
    }),
    getSeedBox.catch(error => {
      console.error(error);
      throw new ConnectError('Unable to open wallet', Code.Internal);
    }),
  ]);

  const getSpendKey = passKey.unseal(seedBox).then(seedPhrase => generateSpendKey(seedPhrase!));

  return getSpendKey.catch(error => {
    console.error(error);
    throw new ConnectError('Unable to retrieve spend key', Code.Internal);
  });
};
