import { useStore } from '../../../state';
import { getDefaultFrontend } from '../../../state/default-frontend';
import { Button } from '@repo/ui/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { MouseEventHandler } from 'react';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';

export const FrontendLink = () => {
  const frontendUrl = useStore(getDefaultFrontend);

  // Append '/portfolio' path for the default dex frontend; use the base minifront URL for all others.
  const href =
    frontendUrl === 'https://dex.penumbra.zone'
      ? new URL('/portfolio', frontendUrl).toString()
      : frontendUrl;

  const navigate = usePopupNav();

  // In case the frontendUrl is not set, prevent the link action, and open the settings page instead
  const onClick: MouseEventHandler = event => {
    if (frontendUrl) {
      return;
    }
    event.stopPropagation();
    navigate(PopupPath.SETTINGS_DEFAULT_FRONTEND);
  };

  return (
    <a href={href} target='_blank' rel='noreferrer'>
      <Button className='flex w-full items-center gap-2' variant='gradient' onClick={onClick}>
        Manage portfolio {href && <ExternalLink size={16} />}
      </Button>
    </a>
  );
};
