import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { IconButton } from '@/components/ui/IconButton';
import {
  useConversation,
  useMessages,
  useSetConversationModel,
} from '@/features/conversations/hooks';
import { ModelPicker } from '@/features/models/ModelPicker';
import { useSettings } from '@/features/settings/settingsStore';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useColors } from '@/theme/colors';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import { MessageItem, type DisplayMessage } from './components/MessageItem';
import { toDisplayMessages } from './toDisplayMessages';
import { useChat } from './useChat';

interface Props {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onOpenDrawer: () => void;
  onNewChat: () => void;
}

export function ChatScreen({
  conversationId,
  onConversationCreated,
  onOpenDrawer,
  onNewChat,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const keyboardVisible = useKeyboardVisible();
  const listRef = useRef<FlatList<DisplayMessage>>(null);
  const [showJump, setShowJump] = useState(false);

  const backend = useSettings((s) => s.backend);
  const defaultModel = useSettings((s) => s.defaultModel);
  const setDefaultModel = useSettings((s) => s.setDefaultModel);
  const { data: conversation } = useConversation(conversationId);
  const { data: messages = [] } = useMessages(conversationId);
  const setConversationModel = useSetConversationModel();
  const chat = useChat(conversationId);

  const model = conversation?.model ?? defaultModel;
  const items = toDisplayMessages(messages, chat.stream);
  const lastAssistantId = items.find((m) => m.role === 'assistant')?.id;

  const changeModel = (m: string) => {
    setDefaultModel(m);
    if (conversationId) setConversationModel.mutate({ id: conversationId, model: m });
  };

  const send = useCallback(
    (text: string) => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      void chat.send(text, model, onConversationCreated);
    },
    [chat, model, onConversationCreated],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setShowJump(e.nativeEvent.contentOffset.y > 240);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-paper dark:bg-night"
    >
      <View
        style={{ paddingTop: insets.top }}
        className="flex-row items-center justify-between px-2 pb-1"
      >
        <IconButton icon="menu" label="Open conversations" onPress={onOpenDrawer} />
        <ModelPicker value={model} onChange={changeModel} />
        <IconButton icon="create-outline" label="New chat" onPress={onNewChat} />
      </View>

      <OfflineBanner usingMock={backend === 'mock'} />

      {items.length === 0 ? (
        <EmptyState onPick={send} />
      ) : (
        <View className="flex-1">
          <FlatList
            ref={listRef}
            inverted
            data={items}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageItem
                message={item}
                isLast={item.id === lastAssistantId}
                onRegenerate={
                  conversationId ? () => void chat.regenerate(conversationId, model) : undefined
                }
                onRetry={conversationId ? () => void chat.retry(conversationId, model) : undefined}
              />
            )}
            contentContainerClassName="px-4 pt-4"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={64}
            accessibilityLabel="Messages"
            testID="message-list"
          />
          {showJump ? (
            <Pressable
              onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
              accessibilityRole="button"
              accessibilityLabel="Scroll to latest message"
              className="absolute bottom-3 self-center h-9 w-9 items-center justify-center rounded-full border border-paper-line bg-paper shadow-sm dark:border-night-line dark:bg-night-soft"
            >
              <Ionicons name="arrow-down" size={18} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      )}

      <View
        className="px-3 pt-2"
        style={{ paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 8) }}
      >
        <Composer isStreaming={chat.isStreaming} onSend={send} onStop={chat.stop} />
      </View>
    </KeyboardAvoidingView>
  );
}
