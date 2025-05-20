import { ChainRegistryClient } from '@penumbra-labs/registry';
import { MetadataFetchFn } from '@repo/ui/components/ui/tx';
import { viewClient } from '../../../../clients';

export const getMetadata: MetadataFetchFn = async ({ assetId }) => {
  const feeAssetId = assetId ? assetId : new ChainRegistryClient().bundled.globals().stakingAssetId;

  const { denomMetadata } = await viewClient.assetMetadataById({ assetId: feeAssetId });
  return denomMetadata;
};
