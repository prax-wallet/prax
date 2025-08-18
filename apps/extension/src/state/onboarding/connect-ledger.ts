import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { AllSlices, SliceCreator } from '..';
import { Address, FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { DEFAULT_PATH as PENUMBRA_PATH, PenumbraApp } from '@zondax/ledger-penumbra';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { PlainMessage, toPlainMessage } from '@bufbuild/protobuf';

export interface OnboardConnectLedgerSlice {
  specificDevice?: {
    [K in keyof Required<USBDeviceFilter>]: USBDeviceFilter[K];
  };

  fullViewingKey?: PlainMessage<FullViewingKey>;
  address?: PlainMessage<Address>;

  appInfo?: Awaited<ReturnType<PenumbraApp['appInfo']>>;
  deviceInfo?: Awaited<ReturnType<PenumbraApp['deviceInfo']>>;

  getAppInfo: (app: PenumbraApp) => Promise<void>;
  getDeviceInfo: (app: PenumbraApp) => Promise<void>;

  initOnboardingType: () => void;
  clearLedgerState: () => void;

  requestPairingDevice: () => Promise<USBDevice>;

  connectLedgerApp: (device: USBDevice) => Promise<PenumbraApp>;

  getAddress: (app: PenumbraApp) => Promise<void>;

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

  getAddress: async (app: PenumbraApp) => {
    const { address: ledgerAddress } = await app.getAddress(PENUMBRA_PATH, {
      account: 0,
      randomizer: Buffer.alloc(12, 0),
    });

    if (!ledgerAddress) {
      throw new ReferenceError('Failed to retrieve address from Ledger device');
    }

    set(state => {
      state.onboarding.connectLedger.address = toPlainMessage(
        new Address({ inner: Uint8Array.from(ledgerAddress) }),
      );
    });
  },

  getAppInfo: async (app: PenumbraApp) => {
    try {
      const appInfo = await app.appInfo();
      if (appInfo.appName !== 'Penumbra') {
        throw new Error(`Expected Penumbra app, got ${appInfo.appName} instead`);
      }
      set(state => {
        state.onboarding.connectLedger.appInfo = appInfo;
      });
    } catch (cause) {
      console.error(cause);
      if (cause instanceof Error) {
        throw new Error(`Failed to get app info: ${cause.message}`, { cause });
      }
      throw new Error(`Failed to get app info: ${String(cause)}`, { cause });
    }
  },

  getDeviceInfo: async (app: PenumbraApp) => {
    const deviceInfo = await app.deviceInfo();
    set(state => {
      state.onboarding.connectLedger.deviceInfo = deviceInfo;
    });
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
      state.onboarding.connectLedger.appInfo = undefined;
      state.onboarding.connectLedger.deviceInfo = undefined;
      state.onboarding.connectLedger.specificDevice = undefined;
      state.onboarding.connectLedger.fullViewingKey = undefined;
      state.onboarding.connectLedger.address = undefined;
    });
  },
});

export const selectOnboardingLedger = (state: AllSlices) => {
  const { initOnboardingType, ...etc } = state.onboarding.connectLedger;
  initOnboardingType();
  return etc;
};
