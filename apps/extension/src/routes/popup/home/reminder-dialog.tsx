import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { PopupPath } from '../paths';
import { usePopupNav } from '../../../utils/navigate';

export const ReminderDialog = ({
  showReminder,
  setShowReminder,
  dismissReminder,
}: {
  showReminder?: boolean;
  setShowReminder: (show: boolean) => void;
  dismissReminder: () => Promise<void>;
}) => {
  const navigate = usePopupNav();

  return (
    <Dialog open={showReminder} onOpenChange={setShowReminder}>
      <DialogContent>
        <div
          className='mx-auto w-[320px] rounded-2xl bg-background/90 backdrop-blur
                                    shadow-2xl ring-1 ring-white/10 p-7 space-y-6 text-center'
        >
          <div className='space-y-3'>
            <div className='flex items-center justify-center gap-2'>
              <InfoCircledIcon className='size-5 text-muted-foreground translate-y-[-2px]' />
              <DialogTitle className='text-xl font-extrabold leading-none'>Reminder</DialogTitle>
            </div>

            <DialogDescription className='text-sm leading-relaxed text-muted-foreground'>
              Back up your seed&nbsp;phrase now&mdash;it’s the only way to recover your wallet.
              <br></br>
              <br></br>
              You can find it anytime in <strong>Security & Privacy</strong>, then{' '}
              <strong>Recovery Passphrase</strong>.
            </DialogDescription>
          </div>
          <DialogFooter className='flex flex-col gap-2'>
            <Button
              variant='ghost'
              size='md'
              className='w-full rounded-md border border-white/10 ring-1 ring-white/10 transition-shadow'
              onClick={() =>
                void dismissReminder().then(() => navigate(PopupPath.SETTINGS_RECOVERY_PASSPHRASE))
              }
            >
              Back up now
            </Button>

            <Button
              variant='ghost'
              size='md'
              className='w-full rounded-md border border-white/10 ring-1 ring-white/10 transition-shadow'
              onClick={() => void dismissReminder()}
            >
              Dismiss
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
