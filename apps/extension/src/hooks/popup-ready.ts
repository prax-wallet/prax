import { useEffect } from 'react';
import { useSearchParams, URLSearchParams, SetURLSearchParams } from 'react-router-dom';
import { PopupReadyMessage } from '../message/popup';

type IsReady = boolean | undefined;

interface PopupURLSearchParams extends URLSearchParams {
  popupId?: string;
}

// signals that react is ready (mounted) to service worker
export const usePopupReady = (isReady: IsReady = undefined) => {
  const [searchParams] = useSearchParams() as [PopupURLSearchParams, SetURLSearchParams];

  useEffect(() => {
    if (searchParams.popupId && (isReady === undefined || isReady)) {
      void chrome.runtime.sendMessage({
        popupReady: true,
        popupId: searchParams.popupId,
      } as PopupReadyMessage);
    }
  }, [searchParams.popupId, isReady]);
};
