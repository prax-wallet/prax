import { praxConnectListener } from './content-script/connect';
import { praxDisconnectListener } from './content-script/disconnect';
import { praxInitListener } from './content-script/init';

import { internalRevokeListener } from './internal/revoke';

// content-script messages
chrome.runtime.onMessage.addListener(praxConnectListener);
chrome.runtime.onMessage.addListener(praxDisconnectListener);
chrome.runtime.onMessage.addListener(praxInitListener);

// internal messages
chrome.runtime.onMessage.addListener(internalRevokeListener);
