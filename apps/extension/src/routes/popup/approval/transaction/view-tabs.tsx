import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { cn } from '@repo/ui/lib/utils';
import { TransactionViewTab } from './types';
import { ClassificationReturn } from '@penumbra-zone/perspective/transaction/classify';
import { useMemo } from 'react';

export const ViewTabs = ({
  defaultValue,
  onValueChange,
  transactionClassificaton,
}: {
  defaultValue: TransactionViewTab;
  onValueChange: (value: TransactionViewTab) => void;
  transactionClassificaton?: ClassificationReturn;
}) => {
  const showReceiverTransactionView = useMemo(
    () => transactionClassificaton?.type === 'send',
    [transactionClassificaton?.type],
  );

  return (
    <Tabs
      defaultValue={defaultValue}
      onValueChange={value => onValueChange(value as TransactionViewTab)}
    >
      <TabsList
        className={cn('mx-auto mb-8 grid w-[100%] gap-4', {
          'grid-cols-2': !showReceiverTransactionView,
          'grid-cols-3': showReceiverTransactionView,
        })}
      >
        <TabsTrigger value={TransactionViewTab.SENDER}>Your View</TabsTrigger>

        {showReceiverTransactionView && (
          <TabsTrigger value={TransactionViewTab.RECEIVER}>Receiver&apos;s View</TabsTrigger>
        )}

        <TabsTrigger value={TransactionViewTab.PUBLIC}>Public View</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
