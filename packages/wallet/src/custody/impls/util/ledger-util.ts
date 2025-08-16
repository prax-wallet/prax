import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import penumbraSpec from '@penumbra-zone/bech32m';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { AuthorizationData } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { PenumbraApp, type ResponseFvk, type ResponseSign } from '@zondax/ledger-penumbra';
import { usbDeviceFilter } from './usb-filter';

/**
 * We're using this instead of the library's device acquisition utility to
 * restrict allowed devices to the specific device used to onboard.
 *
 * Prefers an already-paired device to avoid a permission modal.
 *
 * @todo webusb request modal doesn't work in a popup, where this is used. if no
 * paired device is found, this will fail.
 */
export const getSpecificLedgerDevice = async (filter?: USBDeviceFilter) => {
  const devices = await navigator.usb.getDevices();
  const [paired, ...extra] = devices.filter(d => usbDeviceFilter(filter, d));
  if (extra.length) {
    throw RangeError(`Multiple paired Ledger devices found`, { cause: { filter, devices } });
  }
  if (!paired) {
    throw ReferenceError('No paired Ledger device found', { cause: { filter, devices } });
  }
  return paired;
};

export const getSpecificLedgerApp = async (filter?: USBDeviceFilter, signal?: AbortSignal) => {
  const device = await getSpecificLedgerDevice(filter);
  const transport = await TransportWebUSB.open(device);
  signal?.addEventListener('abort', () => void transport.close());
  return new PenumbraApp(transport);
};

/**
 * Assert that the full viewing key reported by {@link PenumbraApp.getFVK} matches
 * the key recorded during custody onboarding.
 *
 * @param ledgerFvk Awaited output of {@link PenumbraApp.getFVK}
 * @param fullViewingKey Wallet's expected full viewing key
 * @throws Error if the FVKs do not match
 */
export function assertLedgerPenumbraFvk(ledgerFvk: ResponseFvk, fullViewingKey: FullViewingKey) {
  if (!fullViewingKey.equals(convertLedgerResponseFvk(ledgerFvk))) {
    throw new Error('Ledger device does not report the expected full viewing key', {
      cause: { ledgerFvk, fullViewingKey },
    });
  }
}

/**
 * Convert the output of {@link PenumbraApp.sign} to a proper {@link AuthorizationData}
 *
 * @param ledgerSigned Awaited output of {@link PenumbraApp.sign}
 */
export function convertLedgerAuthorizationData(ledgerSigned: ResponseSign): AuthorizationData {
  const signed = {
    // not actually supported by device
    lqtVoteSignatures: [] as Buffer[],
    ...ledgerSigned,
  };

  return new AuthorizationData({
    // not actually supported by device
    lqtVoteAuths: signed.lqtVoteSignatures.map(a => ({ inner: Uint8Array.from(a) })),

    spendAuths: signed.spendAuthSignatures.map(a => ({ inner: Uint8Array.from(a) })),
    delegatorVoteAuths: signed.delegatorVoteSignatures.map(a => ({ inner: Uint8Array.from(a) })),

    effectHash: { inner: Uint8Array.from(signed.effectHash) },
  });
}

/**
 * Convert the output of {@link PenumbraApp.getFVK} to a proper {@link FullViewingKey}
 *
 * @param ledgerFvk Awaited output of {@link PenumbraApp.getFVK}
 */
export function convertLedgerResponseFvk(ledgerFvk: ResponseFvk): FullViewingKey {
  const inner = new Uint8Array(ledgerFvk.ak.length + ledgerFvk.nk.length);

  if (inner.length !== penumbraSpec.penumbrafullviewingkey.byteLength) {
    throw new RangeError(
      `Ledger device FVK is ${inner.length} bytes, expected ${penumbraSpec.penumbrafullviewingkey.byteLength}`,
      { cause: ledgerFvk },
    );
  }

  inner.set(ledgerFvk.ak, 0);
  inner.set(ledgerFvk.nk, ledgerFvk.ak.length);

  return new FullViewingKey({ inner });
}
