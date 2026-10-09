import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { useColors } from '@/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props extends Omit<PressableProps, 'children'> {
  icon: IconName;
  label: string;
  size?: number;
  color?: string;
  className?: string;
}

/** 44pt minimum hit target per Apple HIG, always labelled for VoiceOver. */
export function IconButton({ icon, label, size = 22, color, className = '', ...rest }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className={`h-11 w-11 items-center justify-center rounded-full active:bg-paper-soft dark:active:bg-night-soft ${className}`}
      {...rest}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}
