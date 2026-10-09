import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ConversationSummary } from '@/features/conversations/data/types';
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
} from '@/features/conversations/hooks';
import { groupByDate } from '@/features/conversations/groupByDate';
import { useColors } from '@/theme/colors';
import { RenameDialog } from './RenameDialog';

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  /** Called after the active conversation is deleted. */
  onActiveDeleted: () => void;
}

export function ConversationDrawer({
  activeId,
  onSelect,
  onNewChat,
  onOpenSettings,
  onActiveDeleted,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const { data = [], isLoading } = useConversations(search);
  const rename = useRenameConversation();
  const remove = useDeleteConversation();

  const confirmDelete = (c: ConversationSummary) =>
    Alert.alert('Delete chat?', `"${c.title}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          remove.mutate(c.id, { onSuccess: () => c.id === activeId && onActiveDeleted() });
        },
      },
    ]);

  const openActions = (c: ConversationSummary) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: c.title,
          options: ['Rename', 'Delete', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (i) => {
          if (i === 0) setRenaming(c);
          if (i === 1) confirmDelete(c);
        },
      );
    } else {
      Alert.alert(c.title, undefined, [
        { text: 'Rename', onPress: () => setRenaming(c) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(c) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const sections = groupByDate(data);

  return (
    <View className="flex-1 bg-paper dark:bg-night-deep" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2 px-3 pb-2">
        <View className="h-10 flex-1 flex-row items-center gap-2 rounded-xl bg-paper-soft px-3 dark:bg-night-soft">
          <Ionicons name="search" size={16} color={colors.faint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={colors.faint}
            accessibilityLabel="Search conversations"
            clearButtonMode="while-editing"
            autoCorrect={false}
            className="flex-1 text-[16px] text-ink dark:text-[#ececec]"
          />
        </View>
        <Pressable
          onPress={onNewChat}
          accessibilityRole="button"
          accessibilityLabel="New chat"
          className="h-10 w-10 items-center justify-center rounded-xl active:bg-paper-soft dark:active:bg-night-soft"
        >
          <Ionicons name="create-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        contentContainerClassName="px-2 pb-4"
        renderSectionHeader={({ section }) => (
          <Text
            accessibilityRole="header"
            className="px-3 pb-1 pt-4 text-[13px] font-semibold text-ink-faint"
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const active = item.id === activeId;
          return (
            <Pressable
              onPress={() => onSelect(item.id)}
              onLongPress={() => openActions(item)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint="Opens the chat. Long press to rename or delete."
              accessibilityState={{ selected: active }}
              accessibilityActions={[
                { name: 'rename', label: 'Rename' },
                { name: 'delete', label: 'Delete' },
              ]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'rename') setRenaming(item);
                if (e.nativeEvent.actionName === 'delete') confirmDelete(item);
              }}
              className={`rounded-xl px-3 py-2.5 ${active ? 'bg-paper-soft dark:bg-night-soft' : 'active:bg-paper-soft dark:active:bg-night-soft'}`}
            >
              <Text numberOfLines={1} className="text-[16px] text-ink dark:text-[#ececec]">
                {item.title}
              </Text>
              {item.preview ? (
                <Text numberOfLines={1} className="text-[13px] text-ink-faint">
                  {item.preview}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center px-6 pt-16">
              <Ionicons
                name={search ? 'search' : 'chatbubbles-outline'}
                size={28}
                color={colors.faint}
              />
              <Text className="mt-3 text-center text-[15px] text-ink-faint">
                {search ? `No chats match "${search}"` : 'Your conversations will appear here.'}
              </Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        className="mx-2 flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-paper-soft dark:active:bg-night-soft"
        style={{ marginBottom: Math.max(insets.bottom, 8) }}
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Ionicons name="settings-outline" size={17} color="#fff" />
        </View>
        <Text className="text-[16px] font-medium text-ink dark:text-[#ececec]">Settings</Text>
      </Pressable>

      {renaming ? (
        <RenameDialog
          key={renaming.id}
          visible
          initialTitle={renaming.title}
          onCancel={() => setRenaming(null)}
          onSave={(title) => {
            rename.mutate({ id: renaming.id, title });
            setRenaming(null);
          }}
        />
      ) : null}
    </View>
  );
}
