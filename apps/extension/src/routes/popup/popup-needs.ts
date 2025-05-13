import { redirect } from 'react-router-dom';
import { PopupPath } from './paths';
import { localExtStorage } from '@repo/storage-chrome/local';
import { sessionExtStorage } from '@repo/storage-chrome/session';

export const needsLogin = async (): Promise<Response | null> => {
  const password = await sessionExtStorage.get('passwordKey');
  if (password) {
    return null;
  }

  return redirect(PopupPath.LOGIN);
};

export const needsOnboard = async () => {
  const wallets = await localExtStorage.get('wallets');
  const grpcEndpoint = await localExtStorage.get('grpcEndpoint');
  const frontendUrl = await localExtStorage.get('frontendUrl');

  if (wallets.length && grpcEndpoint !== undefined && frontendUrl !== undefined) {
    return null;
  }

  void chrome.runtime.openOptionsPage();
  window.close();

  return null;
};
