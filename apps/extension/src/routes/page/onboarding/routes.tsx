import { PagePath } from '../paths';
import { OnboardingStart } from './start';
import { GenerateSeedPhrase } from './custody/phrase-generate/generate';
import { ConfirmBackup } from './custody/phrase-generate/confirm-backup';
import { ImportSeedPhrase } from './custody/phrase-import';
import { OnboardingSuccess } from './success';
import { SetPassword } from './password';
import { ConnectLedgerWallet } from './custody/connect-ledger';

export const onboardingRoutes = [
  {
    path: PagePath.WELCOME,
    element: <OnboardingStart />,
  },
  {
    path: PagePath.GENERATE_SEED_PHRASE,
    element: <GenerateSeedPhrase />,
  },
  {
    path: PagePath.CONFIRM_BACKUP,
    element: <ConfirmBackup />,
  },
  {
    path: PagePath.IMPORT_SEED_PHRASE,
    element: <ImportSeedPhrase />,
  },
  {
    path: PagePath.SET_PASSWORD,
    element: <SetPassword />,
  },
  {
    path: PagePath.ONBOARDING_SUCCESS,
    element: <OnboardingSuccess />,
  },
  {
    path: PagePath.CONNECT_LEDGER_WALLET,
    element: <ConnectLedgerWallet />,
  },
];
