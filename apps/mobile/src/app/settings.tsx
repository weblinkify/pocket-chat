import { useRouter } from 'expo-router';

import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { testConnection } from '@/services/chat/createChatService';

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <SettingsScreen
      onClose={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
      testConnection={testConnection}
    />
  );
}
