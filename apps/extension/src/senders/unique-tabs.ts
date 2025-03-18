/**
 * Produces a subset of senders with unique script contexts from a larger
 * collection of senders that may have overlapping script contexts.
 */
export const uniqueTabs = <S extends chrome.runtime.MessageSender>(senders: Iterable<S>) =>
  (function* () {
    // scope by tab id
    for (const [_, senderTabs] of Map.groupBy(senders, s => s.tab?.id)) {
      // scope by document id
      for (const [_, senderDocs] of Map.groupBy(senderTabs, s => s.documentId)) {
        // scope by frame id
        for (const [_, senderFrames] of Map.groupBy(senderDocs, s => s.frameId)) {
          // any given frame's sessions are all controlled by a single content
          // script, so by now these should all be comparable.
          yield senderFrames.reduce(assertSameContentScript);
        }
      }
    }
  })();

/**
 * Senders sharing the same content script context should possess the same tab
 * id, document id, and frame id.
 */
const assertSameContentScript = <B extends chrome.runtime.MessageSender>(
  senderA: chrome.runtime.MessageSender,
  senderB: B,
) => {
  if (senderA.tab?.id !== senderB.tab?.id) {
    throw new Error('Sender tab mismatch', { cause: { senderA, senderB } });
  }

  if (senderA.documentId !== senderB.documentId) {
    throw new Error('Sender document mismatch', { cause: { senderA, senderB } });
  }

  if (senderA.frameId !== senderB.frameId) {
    throw new Error('Sender frame mismatch', { cause: { senderA, senderB } });
  }

  return senderB;
};
