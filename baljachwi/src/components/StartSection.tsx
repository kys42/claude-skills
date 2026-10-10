import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fromMonthKey } from '@/domain/dates';
import { groundOf, monthGround, monthOfKey } from './ground';
import { PlusIcon } from './icons';
import { font, ink } from './theme';

export const START_H = 236;

interface Props {
  bottomKey: number;
  oldestFootprint: string | null;
  topX: number;
  fullW: number;
  insetBottom: number;
  onAddEarlier: () => void;
  onGoFurther: () => void;
}

function StartSectionImpl({ bottomKey, oldestFootprint, topX, fullW, insetBottom, onAddEarlier, onGoFurther }: Props) {
  const month = monthOfKey(bottomKey);
  const before = monthOfKey(bottomKey - 1);
  const { y, m } = fromMonthKey(bottomKey);
  const [oy, om] = oldestFootprint ? oldestFootprint.split('-').map(Number) : [y, m];

  return (
    <View style={{ width: fullW, height: START_H + insetBottom }}>
      <LinearGradient colors={[monthGround(month).bottom, groundOf(before)]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
      <Svg width={fullW} height={60} style={styles.trail} pointerEvents="none">
        {[10, 26, 40].map((cy, i) => (
          <Circle key={cy} cx={topX + (i % 2 ? 4 : -4)} cy={cy} r={2} fill={ink.muted} opacity={0.35 - i * 0.08} />
        ))}
      </Svg>
      <View style={[styles.marker, { left: topX - 7 }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{oldestFootprint ? `${oy}년 ${om}월에 첫 발을 뗐어요` : '이 길의 출발점'}</Text>
        <Text style={styles.sub}>그보다 오래된 일도 남겨 둘 수 있어요.</Text>
        <View style={styles.actions}>
          <Pressable onPress={onAddEarlier} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <PlusIcon size={16} color={ink.strong} />
            <Text style={styles.primaryText}>더 이전의 발자국 남기기</Text>
          </Pressable>
          <Pressable onPress={onGoFurther} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>1년 더 거슬러 가기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const StartSection = memo(StartSectionImpl);

const styles = StyleSheet.create({
  trail: { position: 'absolute', top: 0, left: 0 },
  marker: {
    position: 'absolute',
    top: 54,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: ink.strong,
    backgroundColor: 'transparent',
  },
  body: { position: 'absolute', top: 92, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24, gap: 6 },
  title: { ...font.bold, fontSize: 16, color: ink.strong, textAlign: 'center' },
  sub: { ...font.regular, fontSize: 13, color: ink.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(31, 42, 54, 0.16)',
  },
  primaryText: { ...font.bold, fontSize: 14, color: ink.strong },
  secondary: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  secondaryText: { ...font.regular, fontSize: 13, color: ink.muted, textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
