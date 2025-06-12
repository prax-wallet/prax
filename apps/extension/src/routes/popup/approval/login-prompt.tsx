import { useCallback, useMemo } from 'react';
import { useStore } from '../../../state';
import { loginPromptSelector } from '../../../state/login-prompt';
import { Login } from '../login';
import { PopupType } from '../../../message/popup';

const reasons = {
  [PopupType.TxApproval]: 'Unlock to approve a transaction',
  [PopupType.OriginApproval]: 'Unlock to authorize a dapp',
} as const;

export const LoginPrompt = () => {
  const { sender, next, sendResponse } = useStore(loginPromptSelector);

  const onSuccess = useCallback(() => {
    sendResponse();
    window.close();
  }, [sendResponse]);

  const reason = useMemo(() => {
    switch (next) {
      case PopupType.TxApproval:
        return 'Unlock to approve a transaction';
      case PopupType.OriginApproval:
        return 'Unlock to authorize a dapp';
      default:
        return null;
    }
  }, [next]);

  if (!reason) {
    return null;
  }

  return (
    <>
      <p>{next && reasons[next]}</p>
      <p className='text-technical'>{sender?.origin}</p>
      <Login onSuccess={onSuccess} detail={reason} />
    </>
  );
};
