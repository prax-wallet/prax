import { Button } from '@repo/ui/components/ui/button';
import { useWindowCountdown } from './use-window-countdown';

export const ApproveDeny = ({
  approve,
  deny,
  ignore,
  wait = 0,
}: {
  approve: () => void;
  deny: () => void;
  ignore?: () => void;
  wait?: number;
}) => {
  const count = useWindowCountdown(wait);

  return (
    <div
      className='flex flex-row justify-between gap-4 rounded-md bg-black p-4 shadow-md'
      style={{ paddingBottom: '28px', paddingTop: '28px' }}
    >
      <Button
        variant='gradient'
        className='w-1/2 py-3.5 text-base'
        size='lg'
        onClick={approve}
        disabled={!!count}
      >
        Approve {count !== 0 && `(${count})`}
      </Button>
      <Button
        className='w-1/2 py-3.5 text-base hover:bg-destructive/90'
        size='lg'
        variant='destructiveSecondary'
        onClick={deny}
      >
        Deny
      </Button>
      {ignore && (
        <Button
          className='w-[32%] py-2.5 text-sm hover:bg-destructive/90'
          size='md'
          variant='secondary'
          onClick={ignore}
        >
          Ignore Site
        </Button>
      )}
    </div>
  );
};
