import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sendInternal } from '../message/send/internal';

// signals that react is ready (mounted) to service worker
export const usePopupReady = () => {
  const sentMessagesRef = useRef(new Set());
  const [searchParams] = useSearchParams();
  const popupId = searchParams.get('popupId');

  useEffect(() => {
    if (popupId && !sentMessagesRef.current.has(popupId)) {
      sentMessagesRef.current.add(popupId);
      void sendInternal('Ready', popupId);
    }
  }, [popupId]);
};
