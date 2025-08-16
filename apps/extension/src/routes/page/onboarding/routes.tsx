import { PagePath } from '../paths';
import { OnboardingStart } from './start';
import { GenerateSeedPhrase } from './custody/generate-phrase';
import { ImportSeedPhrase } from './custody/import-phrase';
import { OnboardingSuccess } from './success';
import { OnboardingSetup } from './setup';
import { OnboardingPassword } from './password';
import { ConnectLedger } from './custody/connect-ledger';

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
    path: PagePath.CONNECT_LEDGER,
    element: <ConnectLedger />,
  },
  {
    path: PagePath.ONBOARDING_SETUP,
    element: <OnboardingSetup />,
  },
  {
    path: PagePath.SET_PASSWORD,
    element: <OnboardingPassword />,
  },
  {
    path: PagePath.ONBOARDING_SUCCESS,
    element: <OnboardingSuccess />,
  },
];
