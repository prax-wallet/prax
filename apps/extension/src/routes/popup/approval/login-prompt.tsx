import { useCallback } from 'react';
import { useStore } from '../../../state';
import { loginPromptSelector } from '../../../state/login-prompt';
import { Login } from '../login';

export const LoginPrompt = () => {
  const { sendResponse } = useStore(loginPromptSelector);

  const onSuccess = useCallback(() => {
    sendResponse();
    window.close();
  }, [sendResponse]);

  return <Login onSuccess={onSuccess} />;
};
