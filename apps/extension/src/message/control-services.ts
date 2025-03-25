export enum ServicesRequest {
  ClearCache = 'ClearCache',
  ChangeNumeraires = 'ChangeNumeraires',
}

export const isServicesRequest = (request: unknown): request is ServicesRequest =>
  typeof request === 'string' && request in ServicesRequest;
