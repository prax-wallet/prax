/** While prerendering, the document isn't a valid sender. */
export const prerendering = new Promise<void>(resolve =>
  document.prerendering
    ? document.addEventListener('prerenderingchange', () => resolve(), { once: true })
    : resolve(),
);
