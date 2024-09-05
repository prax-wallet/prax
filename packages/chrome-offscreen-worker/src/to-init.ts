export const toMessageEventInit = ({ data }: MessageEvent<unknown>): MessageEventInit<unknown> => ({
  data: JSON.parse(JSON.stringify(data)) as unknown,
});

export const toErrorEventInit = ({
  message,
  filename,
  lineno,
  colno,
}: ErrorEvent): ErrorEventInit => ({ message, filename, lineno, colno /*, error,*/ });
