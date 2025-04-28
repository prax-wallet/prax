export enum SEED_PHRASE_ORIGIN {
  IMPORTED = 'IMPORTED',
  GENERATED = 'GENERATED',
  NONE = 'NONE',
}

export interface LocationState {
  seedPhrase?: SEED_PHRASE_ORIGIN;
}
