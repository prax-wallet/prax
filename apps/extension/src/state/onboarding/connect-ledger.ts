import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { AllSlices, SliceCreator } from '..';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { DEFAULT_PATH as PENUMBRA_PATH, PenumbraApp } from '@zondax/ledger-penumbra';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PlainMessage, toPlainMessage } from '@bufbuild/protobuf';

export interface OnboardConnectLedgerSlice {
  specificDevice?: {
    [K in keyof Required<USBDeviceFilter>]: USBDeviceFilter[K];
  };

  fullViewingKey?: PlainMessage<FullViewingKey>;

  deviceInfo?: Awaited<ReturnType<PenumbraApp['deviceInfo']>>;

  getDeviceInfo: (app: PenumbraApp) => Promise<void>;

  initOnboardingType: () => void;
  clearLedgerState: () => void;

  requestPairingDevice: () => Promise<USBDevice>;

  connectLedgerApp: (device: USBDevice) => Promise<PenumbraApp>;

  getFullViewingKey: (app: PenumbraApp) => Promise<void>;
}

export const createOnboardConnectLedgerSlice: SliceCreator<OnboardConnectLedgerSlice> = set => ({
  specificDevice: undefined,

  initOnboardingType: () => {
    set(state => {
      state.onboarding.onboardingCustody = 'ledger';
    });
  },

  requestPairingDevice: async () => {
    const device = await navigator.usb.requestDevice({
      filters: [{ vendorId: ledgerUSBVendorId }],
    });

    set(state => {
      state.onboarding.connectLedger.specificDevice = {
        vendorId: device.vendorId,
        productId: device.productId,
        classCode: device.deviceClass,
        subclassCode: device.deviceSubclass,
        protocolCode: device.deviceProtocol,
        serialNumber: device.serialNumber,
      };
    });

    return device;
  },

  connectLedgerApp: async (device: USBDevice) =>
    new PenumbraApp(await TransportWebUSB.open(device)),

  getDeviceInfo: async (app: PenumbraApp) => {
    try {
      const deviceInfo = await app.deviceInfo();
      set(state => {
        state.onboarding.connectLedger.deviceInfo = deviceInfo;
      });
    } catch (cause) {
      console.error(cause);
      throw new Error(
        `Failed to get device info: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
  },

  getFullViewingKey: async (app: PenumbraApp) => {
    const { ak, nk } = await app.getFVK(PENUMBRA_PATH, {
      account: 0,
      randomizer: Buffer.alloc(12, 0),
    });

    const inner = new Uint8Array(64);
    inner.set(ak);
    inner.set(nk, 32);

    set(state => {
      state.onboarding.connectLedger.fullViewingKey = toPlainMessage(new FullViewingKey({ inner }));
    });
  },

  clearLedgerState: () => {
    set(state => {
      state.onboarding.connectLedger.deviceInfo = undefined;
      state.onboarding.connectLedger.specificDevice = undefined;
      state.onboarding.connectLedger.fullViewingKey = undefined;
    });
  },
});

export const selectOnboardingLedger = (state: AllSlices) => {
  const { initOnboardingType, ...etc } = state.onboarding.connectLedger;
  initOnboardingType();
  return etc;
};
