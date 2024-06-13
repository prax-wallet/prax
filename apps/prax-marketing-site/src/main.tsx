import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { rootRouter } from './components/root-router';

import './globals.css';

const Main = () => {
  return <RouterProvider router={rootRouter} />;
};

const rootElement = document.getElementById('root') as HTMLDivElement;
createRoot(rootElement).render(<Main />);
