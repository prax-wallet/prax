export enum PraxConnection {
  Init = 'Init',
  Connect = 'Connect',
  Disconnect = 'Disconnect',
  End = 'End',
}

export const isPraxConnection = (value: unknown): value is PraxConnection =>
  typeof value === 'string' && value in PraxConnection;
