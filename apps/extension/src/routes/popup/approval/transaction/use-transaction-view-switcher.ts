import { viewTransactionPlan } from '@penumbra-zone/perspective/plan/view-transaction-plan';
import {
  ClassificationReturn,
  classifyTransaction,
} from '@penumbra-zone/perspective/transaction/classify';
import {
  asPublicTransactionView,
  asReceiverTransactionView,
} from '@penumbra-zone/perspective/translators/transaction-view';
import { AssetId, Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  TransactionPlan,
  TransactionView,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { Wallet } from '@penumbra-zone/types/wallet';
import { useEffect, useMemo, useState } from 'react';
import { viewClient } from '../../../../clients';
import { TransactionViewTab } from './types';

const isControlledAddress = (address: Address) =>
  viewClient.indexByAddress({ address }).then(({ addressIndex }) => Boolean(addressIndex));
const getMetadata = async (assetId: AssetId) => {
  try {
    const { denomMetadata } = await viewClient.assetMetadataById({ assetId });
    return denomMetadata ?? new Metadata({ penumbraAssetId: assetId });
  } catch {
    return new Metadata({ penumbraAssetId: assetId });
  }
};

export const useTransactionViewSwitcher = ({
  plan,
  wallet,
}: {
  plan?: TransactionPlan;
  wallet?: Wallet;
}): {
  selectedTransactionView: TransactionView | undefined;
  selectedTransactionViewName: TransactionViewTab;
  setSelectedTransactionViewName: (value: TransactionViewTab) => void;
  transactionClassification?: ClassificationReturn;
} => {
  const [asSender, setAsSender] = useState<TransactionView>();
  const [asPublic, setAsPublic] = useState<TransactionView>();
  const [asReceiver, setAsReceiver] = useState<TransactionView>();
  const [transactionClassification, setTransactionClassification] =
    useState<ClassificationReturn>();

  useEffect(() => {
    if (plan && wallet) {
      if (!asSender) {
        void viewTransactionPlan(
          plan,
          getMetadata,
          FullViewingKey.fromJsonString(wallet.fullViewingKey),
        ).then(txv => {
          setAsSender(txv);
          setAsPublic(asPublicTransactionView(txv));
          setTransactionClassification(classifyTransaction(txv));
        });
      } else if (!asReceiver) {
        void asReceiverTransactionView(asSender, { isControlledAddress }).then(setAsReceiver);
      }
    }
  }, [plan, wallet, asSender, asReceiver]);

  const [selectedTransactionViewName, setSelectedTransactionViewName] =
    useState<TransactionViewTab>(TransactionViewTab.SENDER);

  const selectedTransactionView = useMemo(() => {
    switch (selectedTransactionViewName) {
      case TransactionViewTab.SENDER:
        return asSender;
      case TransactionViewTab.PUBLIC:
        return asPublic;
      case TransactionViewTab.RECEIVER:
        return asReceiver;
      default:
        throw new TypeError('Unknown view', { cause: selectedTransactionViewName });
    }
  }, [asSender, asReceiver, asPublic, selectedTransactionViewName]);

  return {
    selectedTransactionView,
    selectedTransactionViewName,
    setSelectedTransactionViewName,
    transactionClassification,
  };
};
