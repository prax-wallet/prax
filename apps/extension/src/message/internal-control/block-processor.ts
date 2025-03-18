export enum BlockProcessorRequest {
  ClearCache = 'ClearCache',
  ChangeNumeraires = 'ChangeNumeraires',
}

export const isBlockProcessorRequest = (request: unknown): request is BlockProcessorRequest =>
  typeof request === 'string' && request in BlockProcessorRequest;
