import {
  BarChartIcon,
  DashboardIcon,
  ExitIcon,
  HomeIcon,
  Link1Icon,
  LockClosedIcon,
  Share1Icon,
} from '@radix-ui/react-icons';
import { CustomLink } from '../../../shared/components/link';
import { useStore } from '../../../state';
import { passwordSelector } from '../../../state/password';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';
import { SettingsScreen } from './settings-screen';
// import { useChainIdQuery } from '../../../hooks/chain-id';
// import { useNumeraires } from '../../../hooks/numeraires-query';

const links = [
  {
    title: 'Security & Privacy',
    icon: <LockClosedIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_SECURITY,
  },
  {
    title: 'RPC',
    icon: <Share1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_RPC,
  },
  {
    title: 'Default frontend',
    icon: <HomeIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_DEFAULT_FRONTEND,
  },
  {
    title: 'Connected sites',
    icon: <Link1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_CONNECTED_SITES,
  },
  {
    title: 'Price denomination',
    icon: <BarChartIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_NUMERAIRES,
  },
  {
    title: 'Advanced',
    icon: <DashboardIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_ADVANCED,
  },
];

export const Settings = () => {
  const navigate = usePopupNav();
  const { clearSessionPassword } = useStore(passwordSelector);

  // const { chainId } = useChainIdQuery();
  // const { numeraires } = useNumeraires(chainId);

  return (
    <SettingsScreen title='Settings'>
      <div className='flex grow flex-col justify-between'>
        <div className='flex flex-1 flex-col items-start gap-5'>
          {links.map(i => (
            <CustomLink
              key={i.href}
              title={i.title}
              icon={i.icon}
              onClick={() => navigate(i.href)}
              // disabled={i.href === PopupPath.SETTINGS_NUMERAIRES && numeraires.length === 0}
            />
          ))}
        </div>

        <div className='mx-[-30px] border-t border-[rgba(75,75,75,0.50)] p-[30px] pb-0'>
          <CustomLink
            title='Lock Wallet'
            icon={<ExitIcon className='size-5 text-muted-foreground' />}
            onClick={() => {
              clearSessionPassword();
              // Normally we could do: navigate(PopupPath.LOGIN)
              // However, for security reasons, we are reloading the window to guarantee
              // the password does not remain in memory. Auditors have not trusted that even though
              // it's cleared in Zustand that it could still be extracted somehow.
              chrome.runtime.reload();
            }}
          />
        </div>
      </div>
    </SettingsScreen>
  );
};
