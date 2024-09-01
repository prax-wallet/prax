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
      await localExtStorage.set('walletCreationBlockHeight', Number(blockHeight));
    }

    navigate(PagePath.SET_PASSWORD);
  };

  const handleClick = (event: MouseEvent | FormEvent) => {
    handleSubmit(event).catch((error: unknown) => {
      if (error instanceof Error) {
        console.error('Error during submission:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    });
  };

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='w-[600px] p-6' gradient>
        <CardHeader className='items-center'>
          <CardTitle className='font-semibold'>
            Enter block height when the wallet was created (optional)
          </CardTitle>
          <CardDescription>
            Providing your wallet&apos;s block creation height can help speed up the synchronization
            process, but it&apos;s not required. If you don&apos;t have this information, you can
            safely skip this step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='mt-6 grid gap-4' onSubmit={handleClick}>
            <Input
              type='text'
              placeholder=''
              value={blockHeight}
              onChange={e => setBlockHeight(e.target.value)}
              className='text-[15px] font-normal leading-[22px]'
            />
            <Button className='mt-4' variant='gradient' onClick={handleClick}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
