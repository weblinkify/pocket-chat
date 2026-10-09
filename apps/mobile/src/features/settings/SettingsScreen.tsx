import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { useClearConversations } from '@/features/conversations/hooks';
import { useColors } from '@/theme/colors';
import { useSettings, type Backend } from './settingsStore';

type Status =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; models: number }
  | { kind: 'error'; message: string };

interface Props {
  onClose: () => void;
  testConnection: (url: string) => Promise<number>;
}

const OPTIONS: { value: Backend; label: string; hint: string }[] = [
  { value: 'mock', label: 'On-device mock', hint: 'Works offline, no server needed' },
  { value: 'server', label: 'Server', hint: 'Streams from the Pocket Chat API' },
];

function Section({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <View className="mb-6">
      <Text
        accessibilityRole="header"
        className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-faint"
      >
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl bg-paper dark:bg-night-soft">{children}</View>
      {footer ? (
        <Text className="mt-2 px-4 text-[13px] leading-[18px] text-ink-faint">{footer}</Text>
      ) : null}
    </View>
  );
}

export function SettingsScreen({ onClose, testConnection }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { backend, apiUrl, setBackend, setApiUrl } = useSettings();
  const [url, setUrl] = useState(apiUrl);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const clear = useClearConversations();

  const test = async () => {
    setApiUrl(url);
    setStatus({ kind: 'testing' });
    try {
      setStatus({ kind: 'ok', models: await testConnection(url.trim()) });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'Connection failed' });
    }
  };

  const confirmClear = () =>
    Alert.alert('Delete all chats?', 'This removes every conversation on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => clear.mutate() },
    ]);

  return (
    <View className="flex-1 bg-paper-soft dark:bg-night-deep" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-2 pb-2">
        <IconButton icon="chevron-back" label="Back" onPress={onClose} />
        <Text
          accessibilityRole="header"
          className="flex-1 text-center text-[17px] font-semibold text-ink dark:text-[#ececec]"
        >
          Settings
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        contentContainerClassName="px-4 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Section
          title="Assistant backend"
          footer="The on-device mock streams canned markdown replies. Try sending “code”, “error” or “slow”."
        >
          {OPTIONS.map((o, i) => {
            const selected = backend === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setBackend(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${o.label}, ${o.hint}`}
                className={`flex-row items-center px-4 py-3.5 active:bg-paper-soft dark:active:bg-night ${i > 0 ? 'border-t border-paper-line dark:border-night-line' : ''}`}
              >
                <View className="flex-1">
                  <Text className="text-[16px] text-ink dark:text-[#ececec]">{o.label}</Text>
                  <Text className="text-[13px] text-ink-faint">{o.hint}</Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </Section>

        {backend === 'server' ? (
          <Section
            title="Server URL"
            footer="On a real iPhone use your Mac's LAN address, e.g. http://192.168.1.20:8000, and run `pnpm api:dev`."
          >
            <TextInput
              value={url}
              onChangeText={setUrl}
              onEndEditing={() => setApiUrl(url)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://192.168.1.20:8000"
              placeholderTextColor={colors.faint}
              accessibilityLabel="Server URL"
              className="px-4 py-3.5 text-[16px] text-ink dark:text-[#ececec]"
            />
            <Pressable
              onPress={test}
              disabled={status.kind === 'testing'}
              accessibilityRole="button"
              accessibilityLabel="Test connection"
              className="flex-row items-center justify-between border-t border-paper-line px-4 py-3.5 active:bg-paper-soft dark:border-night-line dark:active:bg-night"
            >
              <Text className="text-[16px] text-accent">
                {status.kind === 'testing' ? 'Testing…' : 'Test connection'}
              </Text>
              {status.kind === 'ok' ? (
                <Text accessibilityLiveRegion="polite" className="text-[14px] text-accent">
                  Connected · {status.models} models
                </Text>
              ) : null}
              {status.kind === 'error' ? (
                <Text
                  accessibilityLiveRegion="polite"
                  numberOfLines={1}
                  className="ml-3 flex-1 text-right text-[14px] text-danger"
                >
                  {status.message}
                </Text>
              ) : null}
            </Pressable>
          </Section>
        ) : null}

        <Section title="Data">
          <Pressable
            onPress={confirmClear}
            accessibilityRole="button"
            accessibilityLabel="Delete all chats"
            className="px-4 py-3.5 active:bg-paper-soft dark:active:bg-night"
          >
            <Text className="text-[16px] text-danger">Delete all chats</Text>
          </Pressable>
        </Section>

        <Section title="About">
          <View className="flex-row justify-between px-4 py-3.5">
            <Text className="text-[16px] text-ink dark:text-[#ececec]">Version</Text>
            <Text className="text-[16px] text-ink-faint">
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}
