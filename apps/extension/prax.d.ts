// these are defined at build time by webpack, using values in .env

declare const PRAX: string;
declare const PRAX_ORIGIN: string;

declare module '*.svg' {
  import type { FunctionComponent, ComponentProps } from 'react';

  const ReactComponent: FunctionComponent<ComponentProps<'svg'> & { title?: string }> & {
    $$typeof: symbol;
  };

  export default ReactComponent;
}
