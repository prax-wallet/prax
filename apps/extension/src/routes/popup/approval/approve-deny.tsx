import { Button } from '@repo/ui/components/ui/button';
import { useWindowCountdown } from './use-window-countdown';

export const ApproveDeny = ({
  approve,
  deny,
  ignore,
}: {
  approve: () => void;
  deny: () => void;
  ignore?: () => void;
  wait?: number;
}) => {
  const count = useWindowCountdown();

  return (
    <div
      className='flex flex-row justify-between gap-4 rounded-md p-4 shadow-md'
      style={{
        backgroundColor: '#1A1A1A',
        paddingBottom: '28px',
        paddingTop: '28px',
      }}
    >
      <Button
        variant='gradient'
        className='w-1/2 py-3.5 text-base'
        size='lg'
        onClick={approve}
        disabled={count > 0}
      >
        Approve {count !== 0}
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
          className='w-1/2 py-3.5 text-base hover:bg-destructive/90'
          size='lg'
          variant='secondary'
          onClick={ignore}
        >
          Ignore Site
        </Button>
      )}
    </div>
  );
};
