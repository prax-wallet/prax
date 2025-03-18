import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ControlRequest } from '../message/control';

// signals that react is ready (mounted) to service worker
export const usePopupReady = () => {
  const sentMessagesRef = useRef(new Set());
  const [searchParams] = useSearchParams();
  const popupId = searchParams.get('popupId');

  useEffect(() => {
    if (popupId && !sentMessagesRef.current.has(popupId)) {
      sentMessagesRef.current.add(popupId);

      void chrome.runtime.sendMessage({
        Ready: popupId,
      } satisfies ControlRequest<'Ready'>);
    }
  }, [popupId]);
};
