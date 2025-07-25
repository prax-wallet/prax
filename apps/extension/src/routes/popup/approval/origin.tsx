import { FadeTransition } from '@repo/ui/components/ui/fade-transition';
import { useStore } from '../../../state';
import { originApprovalSelector } from '../../../state/origin-approval';
import { ApproveDeny } from './approve-deny';
import { LinkGradientIcon } from '../../../icons/link-gradient';
import { DisplayOriginURL } from '../../../shared/components/display-origin-url';
import { cn } from '@repo/ui/lib/utils';
import { UserChoice } from '@repo/storage-chrome/records';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

export const OriginApproval = () => {
  const { requestOrigin, favIconUrl, title, lastRequest, setChoice, sendResponse } =
    useStore(originApprovalSelector);

  const approve = () => {
    setChoice(UserChoice.Approved);
    sendResponse();
    window.close();
  };

  const deny = () => {
    setChoice(UserChoice.Denied);
    sendResponse();
    window.close();
  };

  const ignore = () => {
    setChoice(UserChoice.Ignored);
    sendResponse();
    window.close();
  };

  if (!requestOrigin) {
    return null;
  }

  return (
    <FadeTransition>
      <div className='flex min-h-screen w-screen flex-col gap-6'>
        <h1 className='flex h-[70px] items-center justify-center border-b border-border-secondary font-headline text-xl font-semibold leading-[30px]'>
          Connect
        </h1>
        <div className='mx-auto size-20'>
          <LinkGradientIcon />
        </div>
        <div className='w-full px-[30px]'>
          <div className='flex flex-col gap-2'>
            <div
              className={cn(
                'rounded-[1em]',
                'border-[1px]',
                'border-transparent',
                'p-2',
                '[background:linear-gradient(var(--charcoal),var(--charcoal))_padding-box,_linear-gradient(to_bottom_left,rgb(139,228,217),rgb(255,144,47))_border-box]',
              )}
            >
              <div className='flex flex-col items-center gap-2'>
                <div className='flex h-11 max-w-full items-center rounded-lg bg-black p-2 text-muted-foreground [z-index:30]'>
                  {!!favIconUrl && (
                    <div
                      className={cn(
                        '-ml-3',
                        'relative',
                        'rounded-full',
                        'border-[1px]',
                        'border-transparent',
                        '[background:linear-gradient(var(--charcoal),var(--charcoal))_padding-box,_linear-gradient(to_top_right,rgb(139,228,217),rgb(255,144,47))_border-box]',
                      )}
                    >
                      <img
                        src={favIconUrl}
                        alt='requesting website icon'
                        className='size-20 min-w-20 rounded-full'
                      />
                    </div>
                  )}
                  <div className='-ml-3 w-full truncate p-2 pl-6 font-headline text-lg'>
                    {title ? (
                      <span className='text-primary-foreground'>{title}</span>
                    ) : (
                      <span className='text-muted-foreground underline decoration-dotted decoration-2 underline-offset-4'>
                        no title
                      </span>
                    )}
                  </div>
                </div>
                <div className='z-30 flex min-h-11 w-full items-center overflow-x-auto rounded-lg bg-background p-2 text-muted-foreground'>
                  <div className='mx-auto items-center p-2 text-center leading-[0.8em]'>
                    <DisplayOriginURL url={new URL(requestOrigin)} />
                  </div>
                </div>
              </div>
            </div>
            <div className='mt-3 flex flex-col gap-3 text-muted-foreground'>
              <p>This host wants to connect to your wallet.</p>
              <p className='text-rust-600'>
                <ExclamationTriangleIcon className='mr-2 inline-block' /> Approval will allow this
                host to see your balance and transaction history.
              </p>
            </div>
          </div>
        </div>
        <div className='flex grow flex-col justify-end'>
          <ApproveDeny approve={approve} deny={deny} ignore={lastRequest && ignore} />
        </div>
      </div>
    </FadeTransition>
  );
};
