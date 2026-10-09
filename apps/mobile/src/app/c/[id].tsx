import { DrawerActions } from 'expo-router/react-navigation';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { ChatScreen } from '@/features/chat/ChatScreen';

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const conversationId = !id || id === 'new' ? null : id;

  return (
    <ChatScreen
      conversationId={conversationId}
      onConversationCreated={(cid) => router.setParams({ id: cid })}
      onOpenDrawer={() => navigation.dispatch(DrawerActions.openDrawer())}
      onNewChat={() => router.setParams({ id: 'new' })}
    />
  );
}
