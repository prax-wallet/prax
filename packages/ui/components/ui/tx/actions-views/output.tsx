import { OutputView } from '@penumbra-zone/protobuf/penumbra/core/component/shielded_pool/v1/shielded_pool_pb';
import { ViewBox } from '../viewbox';
import { ValueViewComponent } from '../../value';
import { ValueWithAddress } from './value-with-address';
import { getNote } from '@penumbra-zone/getters/output-view';
import { getAddress } from '@penumbra-zone/getters/note-view';

export const OutputViewComponent = ({ value }: { value: OutputView }) => {
  if (value.outputView.case === 'visible') {
    const note = getNote(value);
    const address = getAddress(note);

    return (
      <ViewBox
        label='Output'
        visibleContent={
          <div className='flex items-center justify-between gap-x-3 gap-y-0 flex-wrap'>
            <ValueViewComponent view={note.value} />
            <ValueWithAddress addressView={address} label='to'>
              <></>
            </ValueWithAddress>
          </div>
        }
      />
    );
  }

  if (value.outputView.case === 'opaque') {
    return <ViewBox label='Output' />;
  }

  return <div>Invalid OutputView</div>;
};
