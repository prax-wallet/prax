import { useStore } from '../state';
import { passwordSelector } from '../state/password';
import { generateSelector } from '../state/onboarding/generate';
import { importSelector } from '../state/onboarding/import';
import { ledgerSelector } from '../state/onboarding/ledger';
import { walletsSelector } from '../state/wallets';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

// Saves hashed password, uses that hash to encrypt the seed phrase
// and then saves that to session + local storage
export const useAddSeedPhraseWallet = () => {
  const { setPassword } = useStore(passwordSelector);
  const { phrase: generatedPhrase } = useStore(generateSelector);
  const { phrase: importedPhrase } = useStore(importSelector);
  const { addSeedPhraseWallet } = useStore(walletsSelector);

  return async (plaintextPassword: string) => {
    // Determine which routes it came through to get here
    const seedPhrase = generatedPhrase.length ? generatedPhrase : importedPhrase;
    await setPassword(plaintextPassword);
    await addSeedPhraseWallet('Wallet #1', seedPhrase);
  };
};

export const useAddLedgerWallet = () => {
  const { setPassword } = useStore(passwordSelector);
  const { fullViewingKey } = useStore(ledgerSelector);
  const { addLedgerWallet } = useStore(walletsSelector);

  return async (plaintextPassword: string) => {
    const fvk = fullViewingKey ? new FullViewingKey(fullViewingKey) : undefined;
    await setPassword(plaintextPassword);
    await addLedgerWallet('Wallet #1', fvk!);
  };
};
