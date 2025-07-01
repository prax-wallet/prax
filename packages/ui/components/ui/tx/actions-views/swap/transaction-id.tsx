import { TransactionId } from '@penumbra-zone/protobuf/penumbra/core/txhash/v1/txhash_pb';
import { Pill } from '../../../pill';
import { useMemo } from 'react';
import { shorten } from '../../../../../lib/utils';
import { uint8ArrayToHex } from '@penumbra-zone/types/hex';

/**
 * Renders a SHA-256 hash of a transaction ID in a pill.
 */
export const TransactionIdComponent = ({ transactionId }: { transactionId: TransactionId }) => {
  const sha = useMemo(() => uint8ArrayToHex(transactionId.inner), [transactionId]);
  return (
    <Pill to={`/tx/${sha}`}>
      <span className='font-mono'>{shorten(sha, 8)}</span>
    </Pill>
  );
};
