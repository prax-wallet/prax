export enum ServicesMessage {
  ClearCache = 'ClearCache',
  ChangeNumeraires = 'ChangeNumeraires',
}

export const isPraxServicesMessage = (msg: unknown): msg is ServicesMessage => {
  return typeof msg === 'string' && Object.values(ServicesMessage).includes(msg as ServicesMessage);
};
