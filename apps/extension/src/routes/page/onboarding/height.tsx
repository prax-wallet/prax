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
import { FormEvent, MouseEvent, useState } from 'react';
import { Input } from '@repo/ui/components/ui/input';
import { localExtStorage } from '../../../storage/local';

export const ImportWalletCreationHeight = () => {
  const navigate = usePageNav();
  const [blockHeight, setBlockHeight] = useState('');

  const handleSubmit = async (event: MouseEvent | FormEvent) => {
    event.preventDefault();

    if (blockHeight) {
      // Save the block height to local extension storage
      localExtStorage.set('walletCreationBlockHeight', Number(blockHeight));
    }

    // Proceed to the next step in the onboarding process
    navigate(PagePath.SET_PASSWORD);
  };

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='p-6 w-[600px]' gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>
            Enter Block Height When the Wallet Was Created (Optional)
          </CardTitle>
          <CardDescription>
            This step is optional. Providing your wallet's block creation height can help speed up
            the synchronization process, but it's not required. If you don't have this information,
            you can safely skip this step.
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
