import { alreadyApprovedSender } from './approve';
import { isValidExternalSender, type ValidExternalSender } from './external';
import { type ValidInternalSender, isValidInternalSender } from './internal';

export const validateSessionPort = async (port: chrome.runtime.Port) => {
  if (isValidInternalSender(port.sender)) {
    return port as chrome.runtime.Port & { sender: ValidInternalSender };
  }

  if (isValidExternalSender(port.sender) && (await alreadyApprovedSender(port.sender))) {
    return port as chrome.runtime.Port & { sender: ValidExternalSender };
  }

  throw new Error('Session sender is not approved', { cause: port.sender });
};
