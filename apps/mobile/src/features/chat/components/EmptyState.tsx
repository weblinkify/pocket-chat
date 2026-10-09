import { Pressable, Text, View } from 'react-native';

export const SUGGESTIONS = [
  { title: 'Show me some code', subtitle: 'with syntax highlighting', prompt: 'Show me some code' },
  { title: 'Say hello', subtitle: 'and list the demo prompts', prompt: 'hello' },
  {
    title: 'Compare options',
    subtitle: 'as a markdown table',
    prompt: 'Compare a few options for me',
  },
  { title: 'Simulate an error', subtitle: 'to try Retry', prompt: 'error' },
];

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <View className="flex-1 justify-end px-4 pb-4">
      <View className="flex-1 items-center justify-center">
        <Text
          accessibilityRole="header"
          className="text-center text-[26px] font-semibold text-ink dark:text-[#ececec]"
        >
          What can I help with?
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.title}
            onPress={() => onPick(s.prompt)}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}, ${s.subtitle}`}
            className="min-w-[47%] flex-1 rounded-2xl border border-paper-line px-4 py-3 active:bg-paper-soft dark:border-night-line dark:active:bg-night-soft"
          >
            <Text className="text-[15px] font-medium text-ink dark:text-[#ececec]">{s.title}</Text>
            <Text className="text-[14px] text-ink-faint">{s.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
