import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type IsReady = boolean | undefined;

// signals that react is ready (mounted) to service worker
export const usePopupReady = (isReady: IsReady = undefined) => {
  const sentMessagesRef = useRef(new Set());
  const [searchParams] = useSearchParams();
  const popupId = searchParams.get('popupId');

  useEffect(() => {
    if (popupId && (isReady === undefined || isReady) && !sentMessagesRef.current.has(popupId)) {
      sentMessagesRef.current.add(popupId);

      void chrome.runtime.sendMessage(popupId);
    }
  }, [popupId, isReady]);
};
