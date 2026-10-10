import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { font } from './theme';

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
}

/** A short note that drops in under the top bar and leaves on its own. Remount (via `key`) for each message. */
export function Toast({ message, top, onDone }: { message: ToastMessage; top: number; onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const native = Platform.OS !== 'web';
    const anim = Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.delay(2200),
      Animated.timing(t, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: native }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
    // Runs once per message; onDone identity may change between renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });
  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}>
      <Animated.View style={[styles.toast, { opacity: t, transform: [{ translateY }] }]} accessibilityLiveRegion="polite">
        <Text style={styles.title}>{message.title}</Text>
        {message.detail ? <Text style={styles.detail}>{message.detail}</Text> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: '#1F2A36',
    shadowColor: '#1F2A36',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  title: { ...font.bold, fontSize: 14, color: '#FFFFFF' },
  detail: { ...font.regular, fontSize: 13, color: '#C9D2DC' },
});
