import { BarChartIcon, HomeIcon, Share1Icon, TrashIcon } from '@radix-ui/react-icons';
import { CustomLink } from '../../../shared/components/link';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';
import { DashboardGradientIcon } from '../../../icons/dashboard-gradient';
import { SettingsScreen } from './settings-screen';

const links = [
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

export const SettingsAdvanced = () => {
  const navigate = usePopupNav();

  return (
    <SettingsScreen title='Advanced' IconComponent={DashboardGradientIcon}>
      <div className='flex flex-1 flex-col items-start gap-2'>
        {links.map(i => (
          <CustomLink key={i.href} title={i.title} icon={i.icon} onClick={() => navigate(i.href)} />
        ))}
      </div>
    </SettingsScreen>
  );
};
