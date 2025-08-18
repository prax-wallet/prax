import type { ReactNode } from 'react';
import { LineWave } from 'react-loader-spinner';

export const WithSpinner = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={className}>
    {children}
    <LineWave height='10' width='10' color='currentColor' wrapperClass='inline-block' />
  </div>
);
