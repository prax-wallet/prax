import { ValueViewComponent } from '../../../value';
import { ValueView } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { getAmount } from '@penumbra-zone/getters/value-view';

/**
 * Renders a one-way swap (which should be the only kind of swap that ever
 * happens) like this:
 *
 * 1.23INPUT -> 4.56OUTPUT
 */
export const OneWaySwap = ({ input, output }: { input: ValueView; output: ValueView }) => {
  const outputAmount = getAmount.optional(output);

  return (
    <div className='flex items-center justify-between'>
      <ValueViewComponent view={input} />
      <div className='relative mx-2 flex items-center'>
        <div className='h-px w-[40px] bg-gray-500' />
        <div
          className='absolute right-[-6px] size-0'
          style={{
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: '6px solid gray',
          }}
        />
      </div>
      <div className='flex items-center justify-end'>
        <ValueViewComponent view={output} showValue={!!outputAmount} />
      </div>
    </div>
  );
};
