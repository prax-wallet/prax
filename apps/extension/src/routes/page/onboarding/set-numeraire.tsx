import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { NumeraireForm } from '../../../shared/components/numeraires-form';
import { useStore } from '../../../state';

export const SetNumerairesPage = () => {
  const navigate = usePageNav();
  const chainId = useStore(state => state.network.chainId);

  const onSuccess = (): void => {
    navigate(PagePath.ONBOARDING_SUCCESS);
  };

  return (
    <FadeTransition>
      <Card className='w-[400px]' gradient>
        <CardHeader>
          <CardTitle>In which token denomination would you prefer to price assets?</CardTitle>
          <CardDescription>
            Prax does not use third-party price providers for privacy reasons. Instead, Prax indexes
            asset prices locally by selected denomination.
          </CardDescription>
        </CardHeader>
        <div className='mt-6'>
          <NumeraireForm isOnboarding onSuccess={onSuccess} chainId={chainId} />
        </div>
      </Card>
    </FadeTransition>
  );
};
