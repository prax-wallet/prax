import { useCallback, useMemo } from 'react';
import { useStore } from '../../../state';
import { loginPromptSelector } from '../../../state/login-prompt';
import { Login } from '../login';
import { PopupType } from '../../../message/popup';

export const LoginPrompt = () => {
  const { sender, next, sendResponse } = useStore(loginPromptSelector);

  const onSuccess = useCallback(() => {
    sendResponse();
    window.close();
  }, [sendResponse]);

  const { reason, detail } = useMemo(() => {
    switch (next) {
      case PopupType.TxApproval:
        return { reason: 'Review transaction request' };
      case PopupType.OriginApproval:
        return {
          reason: 'Review connection request',
          detail: (
            <>
              from{' '}
              <span className='font-mono'>{sender?.origin && new URL(sender.origin).hostname}</span>
            </>
          ),
        };
      default:
        return {};
    }
  }, [next]);

  if (!reason) {
    return null;
  }

  return <Login onSuccess={onSuccess} message={reason} detail={detail} />;
};
