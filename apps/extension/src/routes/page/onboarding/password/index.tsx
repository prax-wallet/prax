import { useStore } from '../../../../state';
import { onboardPasswordSelector } from '../../../../state/onboarding';
import { CreatePassword } from './create-password';
import { ConfirmPassword } from './confirm-password';
import { useCallback, useState } from 'react';
import { usePageNav } from '../../../../utils/navigate';
import { PagePath } from '../../paths';
import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { Card } from '@repo/ui/components/ui/card';

export const OnboardingPassword = () => {
  const navigate = usePageNav();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Error>();
  const { hasPassword, onboardWallet, onboardPassword } = useStore(onboardPasswordSelector);

  const attemptPassword = useCallback(
    async (password: string) => {
      setPending(true);
      try {
        const key = await onboardPassword(password);
        await onboardWallet(key);
        navigate(PagePath.ONBOARDING_SUCCESS);
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause : new Error('An unknown error occurred', { cause }),
        );
      } finally {
        setPending(false);
      }
    },
    [navigate, onboardPassword, onboardWallet],
  );

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='flex w-[400px] flex-col gap-6' gradient>
        {hasPassword ? (
          <ConfirmPassword attemptPassword={attemptPassword} pending={pending} failure={failure} />
        ) : (
          <CreatePassword attemptPassword={attemptPassword} pending={pending} failure={failure} />
        )}
      </Card>
    </FadeTransition>
  );
};
