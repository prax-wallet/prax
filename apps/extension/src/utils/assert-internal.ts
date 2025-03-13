const crxBase = chrome.runtime.getURL('');

export const assertInternalUrl = (check: URL | string): typeof check => {
  if (new URL(check, crxBase).href !== check) {
    throw new Error('URL is not internal', { cause: check });
  }

  return check;
};
