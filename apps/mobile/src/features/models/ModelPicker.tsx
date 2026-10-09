import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/theme/colors';
import { useModels } from './useModels';

const LABELS: Record<string, string> = { 'mock-fast': 'Mock Fast', 'mock-smart': 'Mock Smart' };
export const modelLabel = (id: string) => LABELS[id] ?? id;

/** Header title button that opens a bottom sheet of available models. */
export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (model: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { data: models = [], isError, refetch } = useModels();

  const pick = (id: string) => {
    void Haptics.selectionAsync();
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Model: ${modelLabel(value)}`}
        accessibilityHint="Opens the model picker"
        className="flex-row items-center gap-1 rounded-full px-3 py-2 active:bg-paper-soft dark:active:bg-night-soft"
      >
        <Text
          maxFontSizeMultiplier={1.4}
          className="text-[17px] font-semibold text-ink dark:text-[#ececec]"
        >
          {modelLabel(value)}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.faint} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close model picker"
        />
        <View
          className="rounded-t-3xl bg-paper px-4 pt-3 dark:bg-night-soft"
          style={{ paddingBottom: insets.bottom + 12 }}
          accessibilityViewIsModal
          onAccessibilityEscape={() => setOpen(false)}
          testID="model-sheet"
        >
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-paper-line dark:bg-night-line" />
          <Text
            accessibilityRole="header"
            className="mb-2 px-2 text-[13px] font-semibold uppercase tracking-wide text-ink-faint"
          >
            Model
          </Text>
          {isError ? (
            <Pressable
              onPress={() => void refetch()}
              accessibilityRole="button"
              className="px-2 py-4"
            >
              <Text className="text-[15px] text-danger">
                {"Couldn't load models. Tap to retry."}
              </Text>
            </Pressable>
          ) : null}
          {models.map((m) => {
            const selected = m.id === value;
            return (
              <Pressable
                key={m.id}
                onPress={() => pick(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${modelLabel(m.id)}${m.description ? `, ${m.description}` : ''}`}
                className="flex-row items-center rounded-2xl px-3 py-3.5 active:bg-paper-soft dark:active:bg-night"
              >
                <View className="flex-1">
                  <Text className="text-[16px] font-medium text-ink dark:text-[#ececec]">
                    {modelLabel(m.id)}
                  </Text>
                  {m.description ? (
                    <Text className="text-[14px] text-ink-faint">{m.description}</Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.text} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}
