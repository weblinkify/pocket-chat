import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useOnline } from '@/hooks/useOnline';

export function OfflineBanner({ usingMock }: { usingMock: boolean }) {
  const online = useOnline();
  if (online) return null;
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="mx-4 mb-2 flex-row items-center gap-2 rounded-xl bg-[#fff4e5] px-3 py-2 dark:bg-[#3a2a12]"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#b45309" />
      <Text className="flex-1 text-[13px] text-[#92400e] dark:text-[#fbbf24]">
        {usingMock
          ? "You're offline. The on-device mock still works."
          : "You're offline. Messages will fail until you reconnect."}
      </Text>
    </View>
  );
}
