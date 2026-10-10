import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';

import type { LevelInfo } from '@/domain/level';
import { ChevronIcon } from './icons';
import { TOPBAR_H } from './TrailHead';
import { font, ink } from './theme';

interface Props {
  ground: string;
  insetTop: number;
  offsetX: number;
  level: LevelInfo;
  /** Shown once the walker has gone far down the trail. */
  where: string | null;
  onPressLevel: () => void;
  onBackToToday: () => void;
}

export function TopBar({ ground, insetTop, offsetX, level, where, onPressLevel, onBackToToday }: Props) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { height: insetTop + TOPBAR_H + 18 }]}>
      <LinearGradient pointerEvents="none" colors={[ground, ground, `${ground}00`]} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={[styles.row, { marginTop: insetTop, paddingHorizontal: offsetX + 16 }]}>
        <View style={styles.brand} accessibilityRole="header">
          <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
            <G fill={ink.strong}>
              <G transform="rotate(-10 7 15)">
                <Ellipse cx={7} cy={12} rx={3.1} ry={4.5} />
                <Ellipse cx={7} cy={19.6} rx={2.3} ry={2.2} />
              </G>
              <G transform="rotate(10 17 9)">
                <Ellipse cx={17} cy={6.2} rx={3.1} ry={4.5} />
                <Ellipse cx={17} cy={13.8} rx={2.3} ry={2.2} />
              </G>
            </G>
          </Svg>
          <Text style={styles.brandText}>발자취</Text>
        </View>

        {where ? (
          <Pressable onPress={onBackToToday} accessibilityRole="button" accessibilityLabel={`${where}. 오늘로 돌아가기`} style={({ pressed }) => [styles.where, pressed && styles.pressed]}>
            <Text style={styles.whereText}>{where}</Text>
            <ChevronIcon dir="up" size={14} color={ink.muted} />
            <Text style={styles.whereBack}>오늘</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onPressLevel}
          accessibilityRole="button"
          accessibilityLabel={`레벨 ${level.level} ${level.name}, ${level.steps}걸음`}
          style={({ pressed }) => [styles.level, pressed && styles.pressed]}>
          <View style={styles.levelTop}>
            <Text style={styles.levelLv}>Lv.{level.level}</Text>
            <Text style={styles.levelName}>{level.name}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(6, Math.round(level.progress * 100))}%` }]} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { height: TOPBAR_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandText: { ...font.bold, fontSize: 21, color: ink.strong, letterSpacing: -0.4 },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(31, 42, 54, 0.12)',
  },
  whereText: { ...font.bold, fontSize: 13, color: ink.strong, marginRight: 2 },
  whereBack: { ...font.regular, fontSize: 12, color: ink.muted },
  level: {
    minHeight: 40,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(31, 42, 54, 0.1)',
  },
  levelTop: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  levelLv: { ...font.bold, fontSize: 12, color: ink.strong },
  levelName: { ...font.regular, fontSize: 12, color: ink.body },
  track: { height: 2, borderRadius: 1, backgroundColor: 'rgba(31, 42, 54, 0.12)', overflow: 'hidden' },
  fill: { height: 2, borderRadius: 1, backgroundColor: ink.strong },
  pressed: { opacity: 0.7 },
});
