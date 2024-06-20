// this is temporary code to use the externally_connectable permission,
// also providing an easter egg for curious users
chrome.runtime.onMessageExternal.addListener((_, __, response) => {
  response('penumbra is the key');
  return true;
});
