import { CondensedBlockSyncStatus } from '@penumbra-zone/ui/components/ui/block-sync-status/condensed';
import { useSyncProgress } from '../../../hooks/full-sync-height';

export const BlockSync = () => {
  const { latestBlockHeight, fullSyncHeight, error } = useSyncProgress();

  return (
    <CondensedBlockSyncStatus
      fullSyncHeight={BigInt(fullSyncHeight ?? 0)}
      latestKnownBlockHeight={BigInt(latestBlockHeight ?? 0)}
      error={error}
    />
  );
};
