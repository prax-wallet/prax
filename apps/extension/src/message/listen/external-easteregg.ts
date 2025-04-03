// this is temporary code to use the externally_connectable permission,
// also providing an easter egg for curious users
export const externalEasterEggListener = (
  _req: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (r: 'penumbra is the key') => void,
) => {
  sendResponse('penumbra is the key');
  return true;
};
