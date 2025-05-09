import { AddressView } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { ReactNode } from 'react';
import { AddressViewComponent } from '../../address-view';

/**
 * Displays "from" or "to" and an address. Useful for spends, outputs, swaps,
 * etc. where there's a value paired with an address.
 */
export const ValueWithAddress = ({
  children,
  label,
  addressView,
}: {
  children: ReactNode;
  label: 'from' | 'to';
  addressView?: AddressView;
}) => (
  <div className='flex flex-col justify-between gap-2 sm:flex-row'>
    <div className='shrink-0'>{children}</div>

    {addressView && (
      <div className='flex items-center gap-2 overflow-hidden'>
        <span className='whitespace-nowrap font-mono text-sm italic text-foreground'>{label}</span>
        <AddressViewComponent view={addressView} />
      </div>
    )}
  </div>
);
