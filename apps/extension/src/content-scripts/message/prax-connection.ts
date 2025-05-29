export enum PraxConnection {
  Init = 'Init',
  Connect = 'Connect',
  Disconnect = 'Disconnect',
  End = 'End',
  Load = 'Load',
  Preconnect = 'Preconnect',
}

export const isPraxConnection = (value: unknown): value is PraxConnection =>
  typeof value === 'string' && value in PraxConnection;
