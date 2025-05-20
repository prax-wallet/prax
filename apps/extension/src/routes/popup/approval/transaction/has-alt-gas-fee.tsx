import { ChainRegistryClient } from '@penumbra-labs/registry';
import { TransactionView } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';

export const hasAltGasFee = (txv?: TransactionView): boolean => {
  const { stakingAssetId } = new ChainRegistryClient().bundled.globals();
  let feeAssetId = txv?.bodyView?.transactionParameters?.fee?.assetId;
  if (feeAssetId === undefined) {
    feeAssetId = stakingAssetId;
  }

  return feeAssetId.equals(stakingAssetId);
};
