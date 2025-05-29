export enum PraxConnection {
  Connect = 'Connect',
  Disconnect = 'Disconnect',
  Load = 'Load',
}

export const isPraxConnection = (value: unknown): value is PraxConnection =>
  typeof value === 'string' && value in PraxConnection;
