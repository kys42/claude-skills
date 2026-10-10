import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fromMonthKey } from '@/domain/dates';
import { SEASONS, seasonOf } from '@/domain/seasons';
import { ChevronIcon } from './icons';
import { monthOfKey, stretchGround } from './ground';
import { font, ink } from './theme';

export const GAP_H = 128;

interface Props {
  newestKey: number;
  oldestKey: number;
  count: number;
  topX: number;
  bottomX: number;
  fullW: number;
  onOpen: () => void;
}

const label = (key: number) => {
  const { y, m } = fromMonthKey(key);
  return `${y}년 ${m}월`;
};

function GapSectionImpl({ newestKey, oldestKey, count, topX, bottomX, fullW, onOpen }: Props) {
  const ground = stretchGround(monthOfKey(newestKey), monthOfKey(oldestKey));
  const step = seasonOf(monthOfKey(newestKey));
  const years = Math.floor(count / 12);
  const span = years >= 1 ? `${years}년${count % 12 ? ` ${count % 12}달` : ''}` : `${count}달`;

  // A faint dotted path that wanders from where the newer month left off to where the older one begins.
  const dots = Array.from({ length: 13 }, (_, i) => {
    const t = (i + 0.5) / 13;
    const ease = t * t * (3 - 2 * t);
    return { x: topX + (bottomX - topX) * ease + Math.sin(t * Math.PI * 2) * 14, y: t * GAP_H, r: 1.8 + Math.sin(t * Math.PI) * 0.8 };
  });

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${label(newestKey)}부터 ${label(oldestKey)}까지 ${span} 동안 기록 없음. 눌러서 펼치기`}
      style={{ width: fullW, height: GAP_H }}>
      <LinearGradient colors={[ground.top, ground.upper, ground.lower, ground.bottom]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <Svg width={fullW} height={GAP_H} style={StyleSheet.absoluteFill} pointerEvents="none">
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={SEASONS[step].step} opacity={0.75} />
        ))}
      </Svg>
      <View pointerEvents="none" style={styles.center}>
        <View style={styles.pill}>
          <Text style={styles.ellipsis}>⋯</Text>
          <View style={styles.texts}>
            <Text style={styles.range}>
              {label(newestKey)} — {label(oldestKey)}
            </Text>
            <Text style={styles.sub}>{span} 동안 남긴 발자국 없음 · 펼치기</Text>
          </View>
          <ChevronIcon dir="down" size={16} color={ink.muted} />
        </View>
      </View>
    </Pressable>
  );
}

export const GapSection = memo(GapSectionImpl);

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 14,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(31, 42, 54, 0.12)',
  },
  ellipsis: { ...font.bold, fontSize: 20, color: ink.muted, marginTop: -6 },
  texts: { gap: 1 },
  range: { ...font.bold, fontSize: 13, color: ink.strong },
  sub: { ...font.regular, fontSize: 12, color: ink.muted },
});
