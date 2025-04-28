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

/** @todo -- check interface already claimed? */
export const getOrPairUsb = async () => {
  const paired = (await navigator.usb.getDevices()).filter(d => d.vendorId === ledgerUSBVendorId);
  if (!paired.length) {
    paired.push(await navigator.usb.requestDevice({ filters: [{ vendorId: ledgerUSBVendorId }] }));
  }
  return paired;
};

/** Use the first detected device, or pair a new one. */
export const getFirstUsb = () => getOrPairUsb().then(([dev]) => dev!);

export class LedgerPenumbra {
  static connect = async (dev: USBDevice): Promise<LedgerPenumbra> =>
    new LedgerPenumbra(new PenumbraApp(await TransportWebUSB.open(dev)));

  constructor(private readonly app: PenumbraApp) {}

  async getAddress(idx?: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.getAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    inner.set(address!);
    return new Address({ inner });
  }

  async showAddress(idx?: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.showAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    inner.set(address!);
    return new Address({ inner });
  }

  async getFullViewingKey(idx?: PartialMessage<AddressIndex>): Promise<FullViewingKey> {
    const { ak, nk } = await this.app.getFVK(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(64);
    inner.set(ak);
    inner.set(nk, 32);
    return new FullViewingKey({ inner });
  }

  async sign(
    plan: PartialMessage<TransactionPlan>,
    metadata?: string[],
  ): Promise<AuthorizationData> {
    const txBin = new TransactionPlan(plan).toBinary();
    const signed = await this.app.sign(PENUMBRA_PATH, Buffer.from(txBin), metadata);
    return new AuthorizationData({
      effectHash: { inner: Uint8Array.from(signed.effectHash) },
      spendAuths: signed.spendAuthSignatures.map(s => ({ inner: Uint8Array.from(s) })),
      delegatorVoteAuths: signed.delegatorVoteSignatures.map(v => ({ inner: Uint8Array.from(v) })),
      lqtVoteAuths: [], // not supported by device
    });
  }
}

/** Convert `AddressIndex` to the external type of the same name. */
const toLedgerIndex = (idx: PartialMessage<AddressIndex> = {}) => {
  const account = idx.account ?? 0;
  const randomizer = Buffer.alloc(12, idx.randomizer);
  return { account, randomizer };
};
