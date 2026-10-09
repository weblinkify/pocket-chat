import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Markdown } from '@/components/markdown/Markdown';
import type { MessageRole, MessageStatus } from '@/features/conversations/data/types';
import { useColors } from '@/theme/colors';
import { TypingIndicator } from './TypingIndicator';

export interface DisplayMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus | 'streaming' | 'thinking';
  error?: string | undefined;
}

interface Props {
  message: DisplayMessage;
  /** Only the latest assistant reply offers Regenerate. */
  isLast: boolean;
  onRegenerate?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
}

function UserBubble({ content }: { content: string }) {
  return (
    <View
      className="mb-5 mt-1 flex-row justify-end pl-12"
      accessible
      accessibilityLabel={`You said: ${content}`}
    >
      <View className="rounded-bubble bg-paper-soft px-4 py-2.5 dark:bg-night-soft">
        <Text selectable className="text-[16px] leading-[23px] text-ink dark:text-[#ececec]">
          {content}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: 'copy-outline' | 'checkmark' | 'refresh';
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="h-9 w-9 items-center justify-center rounded-lg active:bg-paper-soft dark:active:bg-night-soft"
    >
      <Ionicons name={icon} size={17} color={colors.muted} />
    </Pressable>
  );
}

function AssistantMessage({ message, isLast, onRegenerate, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const { status, content } = message;

  const copy = async () => {
    await Clipboard.setStringAsync(content);
    void Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View
      className="mb-5"
      accessibilityLabel={status === 'thinking' ? undefined : `Assistant said: ${content}`}
    >
      {status === 'thinking' ? <TypingIndicator /> : null}
      {content ? <Markdown>{status === 'streaming' ? `${content} ●` : content}</Markdown> : null}

      {status === 'stopped' ? (
        <Text className="mt-1 text-[13px] italic text-ink-faint">Stopped generating</Text>
      ) : null}

      {status === 'error' ? (
        <View
          accessibilityRole="alert"
          className="mt-1 flex-row items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 dark:bg-[#3b1f21]"
        >
          <Ionicons name="alert-circle" size={20} color="#e5484d" />
          <Text className="flex-1 text-[14px] leading-[20px] text-ink dark:text-[#ececec]">
            {message.error ?? 'Something went wrong.'}
          </Text>
          {onRetry ? (
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry"
              className="rounded-full bg-ink px-3.5 py-1.5 active:opacity-70 dark:bg-[#ececec]"
            >
              <Text className="text-[13px] font-semibold text-paper dark:text-ink">Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {(status === 'done' || status === 'stopped') && content ? (
        <View className="-ml-2 mt-1 flex-row">
          <ActionButton
            icon={copied ? 'checkmark' : 'copy-outline'}
            label={copied ? 'Copied' : 'Copy message'}
            onPress={copy}
          />
          {isLast && onRegenerate ? (
            <ActionButton icon="refresh" label="Regenerate response" onPress={onRegenerate} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const MessageItem = memo(function MessageItem(props: Props) {
  return props.message.role === 'user' ? (
    <UserBubble content={props.message.content} />
  ) : (
    <AssistantMessage {...props} />
  );
});
