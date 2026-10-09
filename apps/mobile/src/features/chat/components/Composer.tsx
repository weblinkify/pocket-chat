import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useColors } from '@/theme/colors';

const LINE_HEIGHT = 22;
const V_PADDING = 16; // py-2
export const MAX_LINES = 6;
export const MAX_COMPOSER_HEIGHT = LINE_HEIGHT * MAX_LINES + V_PADDING;

interface Props {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
}

/** Pill input that grows up to six lines; the trailing button swaps to Stop while streaming. */
export function Composer({ isStreaming, onSend, onStop, disabled = false }: Props) {
  const colors = useColors();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !isStreaming && !disabled;

  const send = () => {
    if (!canSend) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text);
    setText('');
  };

  return (
    <View className="flex-row items-end rounded-[26px] border border-paper-line bg-paper px-4 py-1.5 dark:border-night-line dark:bg-night-soft">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Message"
        placeholderTextColor={colors.faint}
        multiline
        accessibilityLabel="Message"
        accessibilityHint="Type a message to the assistant"
        // iOS grows a multiline field natively; maxHeight caps it at six lines, then it scrolls.
        // (Measuring onContentSizeChange and setting height re-triggers layout and jitters the screen.)
        style={{ maxHeight: MAX_COMPOSER_HEIGHT, lineHeight: LINE_HEIGHT }}
        className="flex-1 py-2 pr-2 text-[16px] text-ink dark:text-[#ececec]"
        maxFontSizeMultiplier={1.6}
        testID="composer-input"
      />
      {isStreaming ? (
        <Pressable
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Stop generating"
          className="mb-1 h-9 w-9 items-center justify-center rounded-full bg-ink active:opacity-70 dark:bg-[#ececec]"
        >
          <View className="h-3 w-3 rounded-[3px] bg-paper dark:bg-ink" />
        </Pressable>
      ) : (
        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          className={`mb-1 h-9 w-9 items-center justify-center rounded-full ${canSend ? 'bg-ink active:opacity-70 dark:bg-[#ececec]' : 'bg-paper-line dark:bg-night-line'}`}
        >
          <Ionicons name="arrow-up" size={20} color={canSend ? colors.bg : colors.faint} />
        </Pressable>
      )}
    </View>
  );
}
