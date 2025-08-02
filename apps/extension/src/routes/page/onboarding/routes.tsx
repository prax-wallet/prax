import { PagePath } from '../paths';
import { OnboardingStart } from './start';
import { GenerateSeedPhrase } from './generate';
import { ImportSeedPhrase } from './import';
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
    path: PagePath.IMPORT_SEED_PHRASE,
    element: <ImportSeedPhrase />,
  },
  {
    path: PagePath.CONNECT_LEDGER_WALLET,
    element: <ConnectLedgerWallet />,
  },
  {
    path: PagePath.SET_PASSWORD,
    element: <SetPassword />,
  },
  {
    path: PagePath.ONBOARDING_SUCCESS,
    element: <OnboardingSuccess />,
  },
];
