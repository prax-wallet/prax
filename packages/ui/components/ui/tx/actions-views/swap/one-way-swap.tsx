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
      <div className='relative mx-2 flex items-center justify-center'>
        <div className='flex items-center justify-center w-16 h-6 rounded-full bg-gray-800 border border-gray-500'>
          <div
            className='flex items-center justify-center'
            style={{
              position: 'relative',
            }}
          >
            <div
              className='flex items-center'
              style={{
                width: '14px',
                height: '2px',
                backgroundColor: 'white',
              }}
            />
            <div
              className='w-0 h-0 ml-[2px]'
              style={{
                borderTop: '4px solid transparent',
                borderBottom: '4px solid transparent',
                borderLeft: '6px solid white',
              }}
            />
          </div>
        </div>
      </div>
      <div className='flex items-center justify-end'>
        <ValueViewComponent view={output} showValue={!!outputAmount} />
      </div>
    </div>
  );
};
