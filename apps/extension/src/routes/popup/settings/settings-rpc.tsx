import { ShareGradientIcon } from '../../../icons/share-gradient';
import { GrpcEndpointForm } from '../../../shared/components/grpc-endpoint-form';
import { SettingsScreen } from './settings-screen';

export const SettingsRPC = () => {
  const onSuccess = async () => {
    // Reload the extension to ensure all scopes holding the old config are killed.
    chrome.runtime.reload();
  };

  return (
    <SettingsScreen title='Network Provider' IconComponent={ShareGradientIcon}>
      <GrpcEndpointForm submitButtonLabel={'Save'} isOnboarding={false} onSuccess={onSuccess} />
    </SettingsScreen>
  );
};
