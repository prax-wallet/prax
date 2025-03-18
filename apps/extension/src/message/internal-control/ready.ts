export type ReadyRequest = string;

export const isReadyRequest = (id: ReadyRequest, Ready: unknown): Ready is typeof id =>
  Ready === id;
