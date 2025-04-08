import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { AllSlices, SliceCreator } from '..';
import { PartialMessage, PlainMessage, toPlainMessage } from '@bufbuild/protobuf';

export interface LedgerFields {
  fullViewingKey?: PlainMessage<FullViewingKey>;
  setFullViewingKey: (fullViewingKey: PartialMessage<FullViewingKey>) => void;
}

export const createLedger: SliceCreator<LedgerFields> = (set, _get) => ({
  fullViewingKey: undefined,
  setFullViewingKey: (fullViewingKey: PartialMessage<FullViewingKey>) => {
    set(state => {
      state.onboarding.ledger.fullViewingKey = toPlainMessage(new FullViewingKey(fullViewingKey));
    });
  },
});

export const ledgerSelector = (state: AllSlices) => state.onboarding.ledger;
