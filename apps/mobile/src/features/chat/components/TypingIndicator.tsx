import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

/** Three pulsing dots; holds still when the user has Reduce Motion on. */
export function TypingIndicator() {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce || cancelled) return;
      loop = Animated.loop(
        Animated.stagger(
          150,
          dots.map((v) =>
            Animated.sequence([
              Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.timing(v, { toValue: 0.3, duration: 300, useNativeDriver: true }),
            ]),
          ),
        ),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [dots]);

  return (
    <View
      accessible
      accessibilityLabel="Assistant is typing"
      accessibilityRole="progressbar"
      className="flex-row gap-1.5 py-3"
    >
      {dots.map((opacity, i) => (
        <Animated.View
          key={i}
          style={{ opacity }}
          className="h-2.5 w-2.5 rounded-full bg-ink dark:bg-[#ececec]"
        />
      ))}
    </View>
  );
}
