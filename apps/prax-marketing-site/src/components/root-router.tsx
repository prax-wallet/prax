import { createHashRouter } from 'react-router-dom';
import { Index } from './index';
import { PrivacyPolicy } from './privacy-policy';

export const rootRouter = createHashRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: 'privacy-policy',
    element: <PrivacyPolicy />,
  },
]);
