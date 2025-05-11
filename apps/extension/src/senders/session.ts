import { alreadyApprovedSender } from './approve';
import { assertValidSender, type ValidSender } from './validate';
import { type InternalSender, isInternalSender } from './internal';

export const assertValidSessionPort = async (port: chrome.runtime.Port) => {
  if (isInternalSender(port.sender)) {
    return port as chrome.runtime.Port & { sender: InternalSender };
  }

  const validSender = assertValidSender(port.sender);
  if (await alreadyApprovedSender(validSender)) {
    return port as chrome.runtime.Port & { sender: ValidSender };
  }

  throw new Error('Session sender is not approved', { cause: port.sender?.origin });
};
