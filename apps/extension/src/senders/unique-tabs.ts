/**
 * Produces a subset of senders with unique script contexts from a larger
 * collection of senders that may have overlapping script contexts.
 */
export function* uniqueTabs<S extends chrome.runtime.MessageSender>(targets: Iterable<S>) {
  // scope by tab id
  for (const [_, senderTabs] of Map.groupBy(targets, s => s.tab?.id)) {
    // scope by document id
    for (const [_, senderDocs] of Map.groupBy(senderTabs, s => s.documentId)) {
      // scope by frame id
      for (const [_, senderFrames] of Map.groupBy(senderDocs, s => s.frameId)) {
        // any given frame's sessions are all controlled by a single content
        // script, so by now these should all be comparable. assert this and
        // yield a single target representing this group.
        yield senderFrames.reduce(assertSameContentScript);
      }
    }
  }
}

/**
 * Senders sharing the same content script context should have the same tab id,
 * document id, and frame id.
 */
const assertSameContentScript = <B extends chrome.runtime.MessageSender>(
  targetA: chrome.runtime.MessageSender,
  targetB: B,
) => {
  if (targetA.tab?.id !== targetB.tab?.id) {
    throw new Error('Target tab mismatch', { cause: { targetA, targetB } });
  }

  if (targetA.documentId !== targetB.documentId) {
    throw new Error('Target document mismatch', { cause: { targetA, targetB } });
  }

  if (targetA.frameId !== targetB.frameId) {
    throw new Error('Target frame mismatch', { cause: { targetA, targetB } });
  }

  return targetB;
};
