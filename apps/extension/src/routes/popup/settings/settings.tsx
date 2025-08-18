import {
  BarChartIcon,
  ExitIcon,
  FileTextIcon,
  HomeIcon,
  Link1Icon,
  Share1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { useCallback, useMemo } from 'react';
import { CustomLink } from '../../../shared/components/link';
import { useStore } from '../../../state';
import { passwordSelector } from '../../../state/password';
import { getActiveWallet } from '../../../state/wallets';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';
import { SettingsScreen } from './settings-screen';

const links = [
  {
    title: 'Recovery Passphrase',
    icon: <FileTextIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_RECOVERY_PASSPHRASE,
  },
  {
    title: 'Connected Sites',
    icon: <Link1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_CONNECTED_SITES,
  },
  {
    title: 'Network Provider',
    icon: <Share1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_RPC,
  },
  {
    title: 'Default Frontend',
    icon: <HomeIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_DEFAULT_FRONTEND,
  },
  {
    title: 'Price Denomination',
    icon: <BarChartIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_NUMERAIRES,
  },
  {
    title: 'Clear Cache',
    icon: <TrashIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_CLEAR_CACHE,
  },
];

export const Settings = () => {
  const navigate = usePopupNav();
  const { clearSessionPassword } = useStore(passwordSelector);
  const wallet = useStore(getActiveWallet);

  const activeLinks = useMemo(
    () =>
      links.filter(i => {
        switch (i.href) {
          case PopupPath.SETTINGS_RECOVERY_PASSPHRASE:
            return wallet?.custodyType === 'encryptedSeedPhrase';
          default:
            return true;
        }
      }),
    [links, wallet?.custodyType],
  );

  const lockWallet = useCallback(() => {
    clearSessionPassword();
    // Restart the extension to guarantee nothing remains in memory.
    chrome.runtime.reload();
  }, [clearSessionPassword]);

  return (
    <SettingsScreen title='Settings and Security'>
      <div className='flex grow flex-col justify-between'>
        <div className='flex flex-1 flex-col items-start gap-5'>
          {activeLinks.map(i => (
            <CustomLink
              key={i.href}
              title={i.title}
              icon={i.icon}
              onClick={() => navigate(i.href)}
            />
          ))}
        </div>
        <div className='mx-[-30px] border-t border-[rgba(75,75,75,0.50)] p-[30px] pb-0'>
          <CustomLink
            title='Lock Wallet'
            icon={<ExitIcon className='size-5 text-muted-foreground' />}
            onClick={lockWallet}
          />
        </div>
      </div>
    </SettingsScreen>
  );
};
