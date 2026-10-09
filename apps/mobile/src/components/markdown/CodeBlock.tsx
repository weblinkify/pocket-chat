import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Highlight, themes } from 'prism-react-renderer';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useColors } from '@/theme/colors';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  sh: 'bash',
};

export function CodeBlock({ code, language }: { code: string; language?: string | undefined }) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const lang = (language && LANGUAGE_ALIASES[language]) || language || 'text';

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
  };

  return (
    <View className="my-2 overflow-hidden rounded-2xl border border-paper-line bg-[#f7f7f8] dark:border-night-line dark:bg-night-deep">
      <View className="flex-row items-center justify-between border-b border-paper-line px-4 py-2 dark:border-night-line">
        <Text className="text-xs font-medium text-ink-soft dark:text-ink-faint">{lang}</Text>
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Code copied' : 'Copy code'}
          hitSlop={10}
          className="flex-row items-center gap-1 active:opacity-60"
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={colors.muted} />
          <Text className="text-xs text-ink-soft dark:text-ink-faint">
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-3"
      >
        <Highlight
          code={code.replace(/\n$/, '')}
          language={lang}
          theme={colors.scheme === 'dark' ? themes.oneDark : themes.oneLight}
        >
          {({ tokens, getTokenProps }) => (
            <Text selectable style={{ fontFamily: MONO, fontSize: 13, lineHeight: 20 }}>
              {tokens.map((line, i) => (
                <Text key={i}>
                  {line.map((token, j) => {
                    const { style, children } = getTokenProps({ token });
                    return (
                      <Text key={j} style={{ color: style?.color ?? colors.text }}>
                        {children}
                      </Text>
                    );
                  })}
                  {i < tokens.length - 1 ? '\n' : ''}
                </Text>
              ))}
            </Text>
          )}
        </Highlight>
      </ScrollView>
    </View>
  );
}
