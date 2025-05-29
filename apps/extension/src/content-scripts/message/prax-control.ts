export enum PraxControl {
  Preconnect = 'Preconnect',
  Init = 'Init',
  End = 'End',
}

export const isPraxControl = (value: unknown): value is PraxControl =>
  typeof value === 'string' && value in PraxControl;
