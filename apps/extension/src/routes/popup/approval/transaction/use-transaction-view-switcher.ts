import { TransactionViewTab } from './types';
import { txApprovalSelector } from '../../../../state/tx-approval';
import { useMemo, useState } from 'react';
import { useStore } from '../../../../state';
import { TransactionView } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const useTransactionViewSwitcher = (): {
  selectedTransactionView: TransactionView | undefined;
  selectedTransactionViewName: TransactionViewTab;
  setSelectedTransactionViewName: (value: TransactionViewTab) => void;
} => {
  const { asSender, asReceiver, asPublic } = useStore(txApprovalSelector);

  const [selectedTransactionViewName, setSelectedTransactionViewName] =
    useState<TransactionViewTab>(TransactionViewTab.SENDER);

  const selectedTransactionView = useMemo(
    () =>
      ({
        asSender,
        asReceiver,
        asPublic,
      })[selectedTransactionViewName],
    [asSender, asReceiver, asPublic, selectedTransactionViewName],
  );

  return {
    selectedTransactionView,
    selectedTransactionViewName,
    setSelectedTransactionViewName,
  };
};
