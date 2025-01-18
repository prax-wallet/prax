import { PopupPath } from '../paths';
import { Settings } from './settings';
import { SettingsAdvanced } from './settings-advanced';
import { SettingsAutoLock } from './settings-auto-lock';
import { SettingsClearCache } from './settings-clear-cache';
import { SettingsConnectedSites } from './settings-connected-sites';
import { SettingsPassphrase } from './settings-passphrase';
import { SettingsRPC } from './settings-rpc';
import { SettingsSecurity } from './settings-security';
import { SettingsDefaultFrontend } from './settings-default-frontend';
// import { SettingsNumeraires } from './settings-numeraires';

export const settingsRoutes = [
  {
    path: PopupPath.SETTINGS,
    element: <Settings />,
  },
  {
    path: PopupPath.SETTINGS_ADVANCED,
    element: <SettingsAdvanced />,
  },
  {
    path: PopupPath.SETTINGS_SECURITY,
    element: <SettingsSecurity />,
  },
  {
    path: PopupPath.SETTINGS_RPC,
    element: <SettingsRPC />,
  },
  {
    path: PopupPath.SETTINGS_DEFAULT_FRONTEND,
    element: <SettingsDefaultFrontend />,
  },
  {
    path: PopupPath.SETTINGS_AUTO_LOCK,
    element: <SettingsAutoLock />,
  },
  {
    path: PopupPath.SETTINGS_CLEAR_CACHE,
    element: <SettingsClearCache />,
  },
  {
    path: PopupPath.SETTINGS_CONNECTED_SITES,
    element: <SettingsConnectedSites />,
  },
  {
    path: PopupPath.SETTINGS_RECOVERY_PASSPHRASE,
    element: <SettingsPassphrase />,
  },
  // {
  //   path: PopupPath.SETTINGS_NUMERAIRES,
  //   element: <SettingsNumeraires />,
  // },
];
