import { praxConnectListener } from './content-script/connect';
import { praxDisconnectListener } from './content-script/disconnect';
import { praxInitListener } from './content-script/init';

import { praxRevokeListener } from './internal/revoke';

import { praxEasterEgg } from './external/message-external';

// content-script messages
chrome.runtime.onMessage.addListener(praxConnectListener);
chrome.runtime.onMessage.addListener(praxDisconnectListener);
chrome.runtime.onMessage.addListener(praxInitListener);

// internal messages
chrome.runtime.onMessage.addListener(praxRevokeListener);

// external messages
chrome.runtime.onMessageExternal.addListener(praxEasterEgg);
