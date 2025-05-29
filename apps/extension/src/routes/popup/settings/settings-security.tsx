import { Link1Icon, PersonIcon } from '@radix-ui/react-icons';
import { EyeGradientIcon } from '../../../icons/eye-gradient';
import { FileTextIcon } from '../../../icons/file-text';
import { CustomLink } from '../../../shared/components/link';
import { usePopupNav } from '../../../utils/navigate';
import { PopupPath } from '../paths';
import { SettingsScreen } from './settings-screen';

const links = [
  {
    title: 'Recovery Passphrase',
    icon: <FileTextIcon />,
    href: PopupPath.SETTINGS_RECOVERY_PASSPHRASE,
  },
  {
    title: 'Reset Password',
    icon: <PersonIcon className='size-5 text-muted-foreground' />,
    href: PopupPath.RESET_PASSWORD,
  },
  {
    title: 'Connected Sites',
    icon: <Link1Icon className='size-5 text-muted-foreground' />,
    href: PopupPath.SETTINGS_CONNECTED_SITES,
  },
];

export const SettingsSecurity = () => {
  const navigate = usePopupNav();

  return (
    <SettingsScreen title='Security & Privacy' IconComponent={EyeGradientIcon}>
      <div className='flex flex-1 flex-col items-start gap-4'>
        {links.map(i => (
          <CustomLink key={i.href} title={i.title} icon={i.icon} onClick={() => navigate(i.href)} />
        ))}
      </div>
    </SettingsScreen>
  );
};
