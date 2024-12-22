import { Ics20Withdrawal } from '@penumbra-zone/protobuf/penumbra/core/component/ibc/v1/ibc_pb';
import { ViewBox } from '../viewbox';
import { ActionDetails } from './action-details';
import { joinLoHiAmount } from '@penumbra-zone/types/amount';
import { getTransmissionKeyByAddress } from '@penumbra-zone/wasm/keys';
import { bech32TransparentAddress } from '@penumbra-zone/bech32m/tpenumbra';

const getUtcTime = (time: bigint) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: 'UTC',
  });
  const date = new Date(Number(time / 1_000_000n));
  return formatter.format(date);
};

export const Ics20WithdrawalComponent = ({ value }: { value: Ics20Withdrawal }) => {
  return (
    <ViewBox
      label='Ics20 Withdrawal'
      visibleContent={
        <ActionDetails>
          {value.denom && <ActionDetails.Row label='Denom'>{value.denom.denom}</ActionDetails.Row>}

          {value.amount && (
            <ActionDetails.Row label='Amount'>
              {joinLoHiAmount(value.amount).toString()}
            </ActionDetails.Row>
          )}

          <ActionDetails.Row label='Destination Address'>
            <span className='truncate max-w-[125px]'>{value.destinationChainAddress}</span>
          </ActionDetails.Row>

          <ActionDetails.Row label='Source channel'>{value.sourceChannel}</ActionDetails.Row>

          {value.returnAddress && (
            <ActionDetails.Row label='Return Address'>
              <span className='truncate max-w-[125px]'>
                {bech32TransparentAddress({
                  inner: getTransmissionKeyByAddress(value.returnAddress),
                })}
              </span>
            </ActionDetails.Row>
          )}

          <ActionDetails.Row label='Use Transparent Address'>
            {value.useTransparentAddress ? 'TRUE' : 'FALSE'}
          </ActionDetails.Row>

          {value.timeoutHeight && (
            <>
              <ActionDetails.Row label='Timeout Revision Height'>
                {value.timeoutHeight.revisionHeight.toString()}
              </ActionDetails.Row>
              <ActionDetails.Row label='Timeout Revision Number'>
                {value.timeoutHeight.revisionNumber.toString()}
              </ActionDetails.Row>
            </>
          )}

          <ActionDetails.Row label='Timeout Time'>
            {getUtcTime(value.timeoutTime)}
          </ActionDetails.Row>
        </ActionDetails>
      }
    />
  );
};
