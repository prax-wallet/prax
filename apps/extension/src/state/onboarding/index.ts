import { SliceCreator } from '..';
import { createGenerate, GenerateFields } from './generate';
import { createImport, ImportFields } from './import';
import { createLedger, LedgerFields } from './ledger';

export interface OnboardingSlice {
  generate: GenerateFields;
  import: ImportFields;
  ledger: LedgerFields;
}

export const createOnboardingSlice: SliceCreator<OnboardingSlice> = (set, get, store) => ({
  generate: { ...createGenerate(set, get, store) },
  import: { ...createImport(set, get, store) },
  ledger: { ...createLedger(set, get, store) },
});
