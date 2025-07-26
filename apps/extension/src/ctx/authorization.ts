import { Code, ConnectError } from '@connectrpc/connect';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { AuthorizeRequest } from '@penumbra-zone/protobuf/penumbra/custody/v1/custody_pb';
import { Jsonified } from '@penumbra-zone/types/jsonified';
import { Key } from '@repo/encryption/key';
import { localExtStorage } from '@repo/storage-chrome/local';
import { UserChoice } from '@repo/storage-chrome/records';
import { sessionExtStorage } from '@repo/storage-chrome/session';
import { Wallet } from '@repo/wallet';
import { PopupType } from '../message/popup';
import { throwIfNeedsLogin } from '../needs-login';
import { popup } from '../popup';

export const getAuthorization = async (plan: TransactionPlan): Promise<AuthorizationData> => {
  await throwIfNeedsLogin();

  const authorization = openWallet().then(custody => custody.authorizePlan(plan));

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

const openWallet = async () => {
  const [passKey, wallet] = await Promise.all([
    sessionExtStorage.get('passwordKey').then(passKeyJson => Key.fromJson(passKeyJson!)),
    localExtStorage.get('wallets').then(wallets => Wallet.fromJson(wallets[0]!)),
  ]);

  return wallet.custody(passKey);
};
