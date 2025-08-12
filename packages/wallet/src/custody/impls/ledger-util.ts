import { ledgerUSBVendorId } from '@ledgerhq/devices/lib-es/index';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import penumbraSpec from '@penumbra-zone/bech32m';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { AuthorizationData } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { PenumbraApp, ResponseFvk, ResponseSign } from '@zondax/ledger-penumbra';

/**
 * We're using this instead of the library's device acquisition utility to
 * restrict allowed devices to the specific device used to onboard.
 *
 * Prefers an already-paired device to avoid a permission modal.
 *
 * @note It's possible that a device pairing may be lost without user intention.
 * If no paired device is found, this will fall back to request pairing a ledger
 * device with the appropriate serial number.
 *
 * @todo webusb request modal doesn't work in a popup, where this is used. so if
 * no paired device is found, this will fail.
 */
export const getLedgerPenumbraBySerial = async (knownSerial: string) => {
  const [paired, ...extra] = await navigator.usb
    .getDevices()
    .then(devices =>
      devices.filter(
        ({ vendorId, serialNumber }) =>
          vendorId === ledgerUSBVendorId && serialNumber === knownSerial,
      ),
    );

  if (extra.length) {
    throw new Error(`Multiple paired Ledger devices with serial number ${knownSerial}`, {
      cause: [paired, ...extra],
    });
  }

  const ledgerDevice =
    paired ??
    // chrome may have dropped the pairing, so fall back to request
    (await navigator.usb.requestDevice({
      filters: [{ vendorId: ledgerUSBVendorId, serialNumber: knownSerial }],
    }));

  return new PenumbraApp(await TransportWebUSB.open(ledgerDevice));
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
