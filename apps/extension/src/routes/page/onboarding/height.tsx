import { BackIcon } from '@repo/ui/components/ui/icons/back-icon';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { usePageNav } from '../../../utils/navigate';
import { PagePath } from '../paths';
import { FormEvent, useState } from 'react';
import { Input } from '@repo/ui/components/ui/input';
import { useOnboardingSaveOptional } from '../../../hooks/onboarding';

export const ImportWalletCreationHeight = () => {
  const navigate = usePageNav();
  const [blockHeight, setBlockHeight] = useState('');
  const onboardingSave = useOnboardingSaveOptional();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    void (async () => {
      await onboardingSave(Number(blockHeight));
      navigate(PagePath.SET_PASSWORD);
    })();
  };

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='w-[600px] p-6' gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>
            Enter the block height at the time your wallet was created. This is your wallet&apos;s
            birthday height (Optional)
          </CardTitle>
          <CardDescription>
            Providing your wallet&apos;s block creation height can help speed up the synchronization
            process, but it&apos;s not required. If you don&apos;t have this information, you can
            safely skip this step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='mt-6 grid gap-4' onSubmit={handleSubmit}>
            <Input
              type='text'
              placeholder=''
              value={blockHeight}
              onChange={e => setBlockHeight(e.target.value)}
              className='text-[15px] font-normal leading-[22px]'
            />
            <Button className='mt-4' variant='gradient' onClick={handleSubmit}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
