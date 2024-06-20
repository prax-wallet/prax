import { originAlreadyApproved } from '../approve-origin';
import { PraxConnection } from '../message/prax';

// trigger injected-connection-port to init when a known page is loaded.
chrome.tabs.onUpdated.addListener(
  (tabId, { status, discarded, url: changeInfoUrl }, { url: tabUrl }) => {
    // Unfortunately, no context for tab
    // void chrome.runtime.getContexts({}).then(console.log);

    const url = changeInfoUrl ?? tabUrl;
    const documentUrls = [tabUrl, changeInfoUrl].filter(id => id) as string[];
    void chrome.runtime.getContexts({}).then(console.log);
    const getContext = chrome.runtime
      .getContexts({ tabIds: [tabId], documentUrls })
      .then(contexts => contexts.filter(({ frameId }) => !frameId)[0]);
    void (async () => {
      const documentId = (await getContext)?.documentId;
      if (
        documentId &&
        status === 'complete' &&
        !discarded &&
        url?.startsWith('https://') &&
        (await originAlreadyApproved(url))
      )
        void chrome.runtime.sendMessage(PraxConnection.Init, { tabId, documentId });
    })();
  },
);
