import { ChromeStorage } from './util/chrome-storage-area';
import { MigratedStorageArea } from './util/migrated-storage-area';
import { local as localDefaults, session as sessionDefaults } from './defaults';
import { PraxStorage } from './versions/prax-storage';

import * as wallet from './methods/wallet';
import { getOriginRecord } from './methods/origin';
import * as onboard from './methods/onboard';
import { throwIfNeedsLogin } from './methods/needs-login';

const local = new MigratedStorageArea(
  ChromeStorage.local<PraxStorage<1>['local']>(),
  localDefaults,
);

const session = new MigratedStorageArea(
  ChromeStorage.session<PraxStorage<1>['session']>(),
  sessionDefaults,
);

export const storage = {
  throwIfNeedsLogin,
  getOriginRecord,
  ...wallet,
  ...onboard,
};
