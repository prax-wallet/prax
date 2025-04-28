import { PartialMessage } from '@bufbuild/protobuf';
import { ledgerUSBVendorId } from '@ledgerhq/devices/lib-es/index';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import {
  Address,
  AddressIndex,
  FullViewingKey,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  AuthorizationData,
  TransactionPlan,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { PenumbraApp } from '@zondax/ledger-penumbra';

import { DEFAULT_PATH as PENUMBRA_PATH } from '@zondax/ledger-penumbra';

export const getLedgerUsb = async () => {
  const paired = await navigator.usb
    .getDevices()
    .then(devices => devices.filter(d => d.vendorId === ledgerUSBVendorId));

  if (paired.length) {
    return paired;
  }

  return [await navigator.usb.requestDevice({ filters: [{ vendorId: ledgerUSBVendorId }] })];
};

export const getLedgerPenumbraApp = async () => {
  const [firstDevice] = await getLedgerUsb();
  return new PenumbraApp(await TransportWebUSB.open(firstDevice!));
};

const toLedgerIndex = ({
  account = 0,
  randomizer = new Uint8Array(12),
}: PartialMessage<AddressIndex> = {}) => ({
  account,
  randomizer: Buffer.from(randomizer, 0, 12),
});

// const fromLedgerIdx = ({ account = 0, randomizer = Buffer.alloc(12) }: LedgerAddressIndex): AddressIndex => new AddressIndex({ account, randomizer: Uint8Array.from(randomizer) });

export class LedgerPenumbraApp {
  constructor(private readonly app: PenumbraApp) {}

  async getAddress(idx: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.getAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    inner.set(address!);
    return new Address({ inner });
  }

  async showAddress(idx: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.showAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    inner.set(address!);
    return new Address({ inner });
  }

  async getFullViewingKey(idx: PartialMessage<AddressIndex>): Promise<FullViewingKey> {
    const { ak, nk } = await this.app.getFVK(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(64);
    inner.set(ak);
    inner.set(nk, 32);
    return new FullViewingKey({ inner });
  }

  async sign(
    plan: PartialMessage<TransactionPlan>,
    metadata: string[] = [],
  ): Promise<AuthorizationData> {
    const signed = await this.app.sign(
      PENUMBRA_PATH,
      Buffer.from(new TransactionPlan(plan).toBinary()),
      metadata,
    );
    return new AuthorizationData({
      effectHash: { inner: Uint8Array.from(signed.effectHash) },
      spendAuths: signed.spendAuthSignatures.map(b => ({ inner: Uint8Array.from(b) })),
      delegatorVoteAuths: signed.delegatorVoteSignatures.map(b => ({ inner: Uint8Array.from(b) })),
    });
  }
}
