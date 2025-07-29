import { PartialMessage } from '@bufbuild/protobuf';
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
import { DEFAULT_PATH as PENUMBRA_PATH, PenumbraApp } from '@zondax/ledger-penumbra';

/** Convert `AddressIndex` to the external type of the same name. */
const toLedgerIndex = (idx: PartialMessage<AddressIndex> = {}) => {
  const account = idx.account ?? 0;
  const randomizer = Buffer.alloc(12, idx.randomizer);
  return { account, randomizer };
};

export class LedgerPenumbra {
  public readonly signal: AbortSignal;
  public readonly release: (reason?: unknown) => Promise<void>;

  private didCloseTransport = false;

  static claimUSB = async (dev: USBDevice): Promise<LedgerPenumbra> =>
    new LedgerPenumbra(new PenumbraApp(await TransportWebUSB.open(dev)));

  constructor(private readonly app: PenumbraApp) {
    const usbAc = new AbortController();

    usbAc.signal.addEventListener('abort', () => {
      if (!this.didCloseTransport) {
        void this.app.transport.close();
      }
    });

    this.signal = usbAc.signal;
    this.release = (reason?: unknown) => {
      const closing = this.app.transport.close();
      this.didCloseTransport = true;
      usbAc.abort(reason);
      return closing;
    };
  }

  async getAddress(idx?: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.getAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- fail if absent
    inner.set(address!);
    return new Address({ inner });
  }

  async showAddress(idx?: PartialMessage<AddressIndex>): Promise<Address> {
    const { address } = await this.app.showAddress(PENUMBRA_PATH, toLedgerIndex(idx));
    const inner = new Uint8Array(80);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- fail if absent
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
