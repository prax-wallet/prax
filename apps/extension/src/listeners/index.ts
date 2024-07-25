import { praxDisconnectListener } from './content-script/disconnect';
import { praxInitListener } from './content-script/init';
import { praxRequestListener } from './content-script/request';

import { praxRevokeListener } from './internal/revoke';

import { praxEasterEgg } from './external/message-external';

// content-script messages
chrome.runtime.onMessage.addListener(praxInitListener);
chrome.runtime.onMessage.addListener(praxDisconnectListener);
chrome.runtime.onMessage.addListener(praxRequestListener);

// internal messages
chrome.runtime.onMessage.addListener(praxRevokeListener);

// external messages
chrome.runtime.onMessageExternal.addListener(praxEasterEgg);
