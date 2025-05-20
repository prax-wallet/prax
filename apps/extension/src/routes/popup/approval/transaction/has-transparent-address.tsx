import { TransactionView } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const hasTransparentAddress = (txv?: TransactionView): boolean => {
  return (
    txv?.bodyView?.actionViews.some(
      action =>
        action.actionView.case === 'ics20Withdrawal' &&
        action.actionView.value.useTransparentAddress,
    ) ?? false
  );
};
