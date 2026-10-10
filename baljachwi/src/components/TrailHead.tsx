import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { daysInMonth, formatKoreanDate, parseISODate } from '@/domain/dates';
import type { LevelInfo } from '@/domain/level';
import { SEASONS, SEASON_ORDER, seasonOf, seasonProgress } from '@/domain/seasons';
import { Shoe } from './glyphs';
import { sectionColors } from './MonthSection';
import { font, ink } from './theme';

interface Props {
  today: string;
  level: LevelInfo;
  bigCount: number;
  smallCount: number;
  showEmpty: boolean;
  topX: number;
  fullW: number;
  offsetX: number;
  contentW: number;
  insetTop: number;
  onAddToday: () => void;
  onLoadSamples: () => void;
}

const GHOST_H = 96;
const SEASON_BAR: Record<string, string> = { spring: '#EBA7BA', summer: '#86B672', autumn: '#D9733A', winter: '#B9C8D8' };

export function TrailHead({ today, level, bigCount, smallCount, showEmpty, topX, fullW, offsetX, contentW, insetTop, onAddToday, onLoadSamples }: Props) {
  const { m, d, y } = parseISODate(today);
  const nowSeason = seasonOf(m);
  const progress = seasonProgress(m, d, daysInMonth(y, m));
  const colors = sectionColors(m);
  // The road ahead already wears the next season.
  const futureGround = SEASONS[SEASON_ORDER[(SEASON_ORDER.indexOf(nowSeason) + 1) % 4]].ground;
  const toNext = level.next === null ? null : level.next - level.steps;

  // Dashed prints wandering from the button down to where today's trail starts.
  const startX = offsetX + contentW / 2;
  const ghosts = [0.12, 0.4, 0.68, 0.94].map((t, i) => {
    const x = startX + (topX - startX) * t + (i % 2 === 0 ? -8 : 8);
    return { x, y: 14 + t * (GHOST_H - 24), opacity: 0.4 + t * 0.5 };
  });

  return (
    <View style={{ width: fullW }}>
      <LinearGradient colors={[futureGround, futureGround, colors.top]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ paddingTop: insetTop + 20, paddingHorizontal: offsetX + 20 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            발자취
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLv}>Lv.{level.level}</Text>
            <Text style={styles.levelName}>{level.name}</Text>
          </View>
        </View>
        <Text style={styles.stats}>
          큰 발자국 {bigCount} · 작은 발자국 {smallCount} · {level.steps}걸음
        </Text>

        <View style={styles.levelTrack} accessibilityLabel={`레벨 진행 ${Math.round(level.progress * 100)}%`}>
          <View style={[styles.levelFill, { width: `${Math.round(level.progress * 100)}%` }]} />
        </View>
        <Text style={styles.levelHint}>
          {toNext === null ? '가장 높은 레벨이에요' : `Lv.${level.level + 1} ${level.nextName}까지 ${toNext}걸음 · 큰 발자국 +5, 작은 발자국 +1`}
        </Text>

        <View style={styles.seasonRow} accessibilityLabel={`올해의 계절, 지금은 ${SEASONS[nowSeason].label}`}>
          {SEASON_ORDER.map((s) => {
            const isNow = s === nowSeason;
            const past = SEASON_ORDER.indexOf(s) < SEASON_ORDER.indexOf(nowSeason);
            return (
              <View key={s} style={styles.seasonCell}>
                <View style={[styles.seasonBar, { backgroundColor: SEASON_BAR[s], opacity: past || isNow ? 1 : 0.35 }]}>
                  {isNow && (
                    <>
                      <View style={[styles.seasonRest, { left: `${progress * 100}%` }]} />
                      <View style={[styles.seasonDot, { left: `${progress * 100}%` }]} />
                    </>
                  )}
                </View>
                <Text style={[styles.seasonLabel, isNow && styles.seasonLabelNow]}>
                  {SEASONS[s].label}
                  {isNow ? ' · 지금' : ''}
                </Text>
              </View>
            );
          })}
        </View>

        <Pressable onPress={onAddToday} accessibilityRole="button" style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" stroke={ink.strong} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.todayText}>오늘의 발자국 남기기</Text>
          <Text style={styles.todayDate}>{formatKoreanDate(today).replace(/^\d+년 /, '')}</Text>
        </Pressable>
        <Text style={styles.hint}>길 위 아무 날이나 누르면 그날의 발자국을 남길 수 있어요.</Text>

        {showEmpty && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 남긴 발자국이 없어요</Text>
            <Text style={styles.emptyBody}>
              성취, 프로젝트, 성장, 변화를 날짜 위에 남겨 보세요. 아래로 내리면 지난달과 지난해의 길이 계속 이어져요.
            </Text>
            <Pressable onPress={onLoadSamples} accessibilityRole="button" style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
              <Text style={styles.emptyButtonText}>예시 발자취 넣어 보기</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Svg width={fullW} height={GHOST_H} accessibilityElementsHidden importantForAccessibility="no">
        {ghosts.map((g, i) => (
          <G key={i} transform={`translate(${g.x} ${g.y}) translate(-6 -10.5) scale(0.75)`}>
            <Shoe fill="none" stroke="#7F95AC" dash="2.6 2.2" opacity={g.opacity} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...font.bold, fontSize: 30, color: ink.strong, letterSpacing: -0.5 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: '#D3DCE5',
  },
  levelLv: { ...font.bold, fontSize: 13, color: ink.strong },
  levelName: { ...font.regular, fontSize: 13, color: ink.body },
  stats: { ...font.regular, fontSize: 13, color: ink.muted, marginTop: 6 },
  levelTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(31, 42, 54, 0.1)', marginTop: 16, overflow: 'hidden' },
  levelFill: { height: 4, borderRadius: 2, backgroundColor: ink.strong },
  levelHint: { ...font.regular, fontSize: 12, color: ink.muted, marginTop: 7 },
  seasonRow: { flexDirection: 'row', gap: 4, marginTop: 18 },
  seasonCell: { flex: 1, gap: 6 },
  seasonBar: { height: 4, borderRadius: 2 },
  seasonRest: { position: 'absolute', top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.62)' },
  seasonDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: ink.strong,
    borderWidth: 3,
    borderColor: '#F2F5F8',
  },
  seasonLabel: { ...font.regular, fontSize: 12, color: ink.muted },
  seasonLabelNow: { ...font.bold, color: ink.strong },
  todayButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9AA8B6',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.7 },
  todayText: { ...font.bold, fontSize: 15, color: ink.strong },
  todayDate: { marginLeft: 'auto', ...font.regular, fontSize: 12, color: ink.muted },
  hint: { ...font.regular, fontSize: 12, color: ink.muted, marginTop: 10 },
  emptyCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#DCE3EA',
    gap: 8,
  },
  emptyTitle: { ...font.bold, fontSize: 16, color: ink.strong },
  emptyBody: { ...font.regular, fontSize: 13, lineHeight: 20, color: ink.body },
  emptyButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: ink.strong,
  },
  emptyButtonText: { ...font.bold, fontSize: 14, color: '#FFFFFF' },
});
