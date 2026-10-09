import { useColorScheme } from 'react-native';

/** JS-side palette for places Tailwind classes can't reach (icons, placeholders, nav theme). */
export const palette = {
  light: {
    bg: '#ffffff',
    surface: '#f4f4f4',
    line: '#e5e5e5',
    text: '#0d0d0d',
    muted: '#5d5d5d',
    faint: '#8e8e8e',
    accent: '#10a37f',
    danger: '#e5484d',
    codeBg: '#f7f7f8',
  },
  dark: {
    bg: '#212121',
    surface: '#2f2f2f',
    line: '#3a3a3a',
    text: '#ececec',
    muted: '#b4b4b4',
    faint: '#8e8e8e',
    accent: '#10a37f',
    danger: '#ff6369',
    codeBg: '#171717',
  },
} as const;

export type Palette = (typeof palette)[keyof typeof palette];

export function useColors(): Palette & { scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palette[scheme], scheme };
}
