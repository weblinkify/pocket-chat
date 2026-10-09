import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useColors } from '@/theme/colors';

interface Props {
  visible: boolean;
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string) => void;
}

/** Mount with a `key` per conversation so the field starts from its current title. */
export function RenameDialog({ visible, initialTitle, onCancel, onSave }: Props) {
  const colors = useColors();
  const [title, setTitle] = useState(initialTitle);
  const valid = title.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-8">
        <View
          accessibilityViewIsModal
          className="w-full max-w-sm rounded-3xl bg-paper p-5 dark:bg-night-soft"
        >
          <Text
            accessibilityRole="header"
            className="mb-3 text-[17px] font-semibold text-ink dark:text-[#ececec]"
          >
            Rename chat
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={() => valid && onSave(title)}
            accessibilityLabel="Chat title"
            placeholder="Chat title"
            placeholderTextColor={colors.faint}
            className="rounded-xl border border-paper-line px-3 py-2.5 text-[16px] text-ink dark:border-night-line dark:text-[#ececec]"
          />
          <View className="mt-4 flex-row justify-end gap-2">
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              className="rounded-full px-4 py-2 active:opacity-60"
            >
              <Text className="text-[15px] font-medium text-ink-soft dark:text-ink-faint">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(title)}
              disabled={!valid}
              accessibilityRole="button"
              accessibilityState={{ disabled: !valid }}
              className={`rounded-full px-4 py-2 ${valid ? 'bg-ink dark:bg-[#ececec]' : 'bg-paper-line dark:bg-night-line'}`}
            >
              <Text className="text-[15px] font-semibold text-paper dark:text-ink">Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
