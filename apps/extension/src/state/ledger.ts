import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { AllSlices, SliceCreator } from '.';
import { PartialMessage, PlainMessage, toPlainMessage } from '@bufbuild/protobuf';

export interface LedgerSlice {
  fullViewingKey?: PlainMessage<FullViewingKey>;
  setFullViewingKey: (fullViewingKey: PartialMessage<FullViewingKey>) => void;
  address?: PlainMessage<Address>;
  setAddress: (address: PartialMessage<Address>) => void;
  clearLedgerData: () => void;
}

export const createLedgerSlice: SliceCreator<LedgerSlice> = (set, _get) => ({
  address: undefined,
  setAddress: (address: PartialMessage<Address>) => {
    set(state => {
      state.ledger.address = toPlainMessage(new Address(address));
    });
  },
  fullViewingKey: undefined,
  setFullViewingKey: (fullViewingKey: PartialMessage<FullViewingKey>) => {
    set(state => {
      state.ledger.fullViewingKey = toPlainMessage(new FullViewingKey(fullViewingKey));
    });
  },
  clearLedgerData: () => {
    set(state => {
      state.ledger.address = undefined;
      state.ledger.fullViewingKey = undefined;
    });
  },
});

export const ledgerSelector = (state: AllSlices) => state.ledger;
