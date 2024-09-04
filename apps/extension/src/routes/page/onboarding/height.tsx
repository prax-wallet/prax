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
import { localExtStorage } from '../../../storage/local';

export const ImportWalletCreationHeight = () => {
  const navigate = usePageNav();
  const [blockHeight, setBlockHeight] = useState<number>();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    void (async () => {
      await localExtStorage.set('walletCreationBlockHeight', blockHeight ? blockHeight : 0);
      navigate(PagePath.SET_PASSWORD);
    })();
  };

  return (
    <FadeTransition>
      <BackIcon className='float-left mb-4' onClick={() => navigate(-1)} />
      <Card className='w-[600px] p-8' gradient>
        <CardHeader className='items-center text-center'>
          <CardTitle className='text-xl font-semibold'>
            Enter your wallet&apos;s birthday (Optional)
          </CardTitle>
          <CardDescription className='mt-2 text-sm'>
            This is the block height at the time your wallet was created. Providing your
            wallet&apos;s block creation height can help speed up the synchronization process, but
            it&apos;s not required. If you don&apos;t have this information, you can safely skip
            this step.
          </CardDescription>
        </CardHeader>
        <CardContent className='mt-8'>
          <form className='grid gap-6' onSubmit={handleSubmit}>
            <Input
              type='number'
              placeholder='Enter block height'
              value={blockHeight ? blockHeight : ''} // prevents uncontrolled form react err
              onChange={e => setBlockHeight(Number(e.target.value))}
              className='rounded-md border border-gray-700 p-3 text-[16px] font-normal leading-[24px]'
            />
            <Button className='mt-6 w-full' variant='gradient' onClick={handleSubmit}>
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeTransition>
  );
};
