import { createHashRouter, RouteObject } from 'react-router-dom';
import { PopupIndex, popupIndexLoader } from './home';
import { Login, popupLoginLoader } from './login';
import { PopupPath } from './paths';
import { PopupLayout } from './popup-layout';
import { Settings } from './settings';
import { settingsRoutes } from './settings/routes';
import { TransactionApproval } from './approval/transaction';
import { OriginApproval } from './approval/origin';
import { LoginPrompt } from './approval/login-prompt';

export const popupRoutes: RouteObject[] = [
  {
    element: <PopupLayout />,
    children: [
      {
        path: PopupPath.INDEX,
        element: <PopupIndex />,
        loader: popupIndexLoader,
      },
      {
        path: PopupPath.LOGIN,
        element: <Login />,
        loader: popupLoginLoader,
      },
      {
        path: PopupPath.SETTINGS,
        element: <Settings />,
        children: settingsRoutes,
      },
      {
        path: PopupPath.TRANSACTION_APPROVAL,
        element: <TransactionApproval />,
      },
      {
        path: PopupPath.ORIGIN_APPROVAL,
        element: <OriginApproval />,
      },
      {
        path: PopupPath.LOGIN_PROMPT,
        element: <LoginPrompt />,
      },
    ],
  },
];

export const popupRouter = createHashRouter(popupRoutes);
