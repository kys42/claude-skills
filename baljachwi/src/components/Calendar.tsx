import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { compareISO, daysInMonth, formatISO, parseISODate } from '@/domain/dates';
import { ChevronIcon } from './icons';
import { font, ink } from './theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  value: string;
  max: string;
  onChange: (iso: string) => void;
}

/** Month grid with a quick year/month jump, for picking any day up to today. */
export function Calendar({ value, max, onChange }: Props) {
  const v = parseISODate(value);
  const limit = parseISODate(max);
  const [view, setView] = useState({ y: v.y, m: v.m });
  const [mode, setMode] = useState<'days' | 'months'>('days');

  const atLimit = view.y > limit.y || (view.y === limit.y && view.m >= limit.m);
  const shift = (delta: number) => {
    const k = view.y * 12 + view.m - 1 + delta;
    const next = { y: Math.floor(k / 12), m: (k % 12) + 1 };
    if (next.y > limit.y || (next.y === limit.y && next.m > limit.m)) return;
    setView(next);
  };

  if (mode === 'months') {
    return (
      <View style={styles.wrap}>
        <View style={styles.head}>
          <Pressable onPress={() => setView({ ...view, y: view.y - 1 })} accessibilityLabel="이전 해" style={styles.navBtn}>
            <ChevronIcon dir="left" color={ink.strong} />
          </Pressable>
          <Pressable onPress={() => setMode('days')} accessibilityRole="button" style={styles.titleBtn}>
            <Text style={styles.title}>{view.y}년</Text>
          </Pressable>
          <Pressable
            onPress={() => view.y < limit.y && setView({ ...view, y: view.y + 1 })}
            disabled={view.y >= limit.y}
            accessibilityLabel="다음 해"
            style={[styles.navBtn, view.y >= limit.y && styles.disabled]}>
            <ChevronIcon dir="right" color={ink.strong} />
          </Pressable>
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const future = view.y > limit.y || (view.y === limit.y && m > limit.m);
            const on = view.y === v.y && m === v.m;
            return (
              <Pressable
                key={m}
                disabled={future}
                onPress={() => {
                  setView({ y: view.y, m });
                  setMode('days');
                }}
                style={[styles.monthCell, on && styles.cellOn, future && styles.disabled]}>
                <Text style={[styles.monthText, on && styles.cellOnText]}>{m}월</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const first = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
  const total = daysInMonth(view.y, view.m);
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => shift(-1)} accessibilityLabel="이전 달" style={styles.navBtn}>
          <ChevronIcon dir="left" color={ink.strong} />
        </Pressable>
        <Pressable onPress={() => setMode('months')} accessibilityRole="button" accessibilityHint="해와 달 고르기" style={styles.titleBtn}>
          <Text style={styles.title}>
            {view.y}년 {view.m}월
          </Text>
          <ChevronIcon dir="down" size={14} color={ink.muted} />
        </Pressable>
        <Pressable onPress={() => shift(1)} disabled={atLimit} accessibilityLabel="다음 달" style={[styles.navBtn, atLimit && styles.disabled]}>
          <ChevronIcon dir="right" color={ink.strong} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEK.map((w, i) => (
          <Text key={w} style={[styles.week, i === 0 && styles.sunday]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.cell} />;
          const iso = formatISO({ y: view.y, m: view.m, d });
          const future = compareISO(iso, max) > 0;
          const on = iso === value;
          const isToday = iso === max;
          return (
            <Pressable
              key={iso}
              disabled={future}
              onPress={() => onChange(iso)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: future }}
              accessibilityLabel={`${view.m}월 ${d}일${isToday ? ', 오늘' : ''}`}
              style={styles.cell}>
              <View style={[styles.day, isToday && !on && styles.today, on && styles.cellOn]}>
                <Text style={[styles.dayText, i % 7 === 0 && styles.sunday, on && styles.cellOnText, future && styles.futureText]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 6, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 12 },
  title: { ...font.bold, fontSize: 15, color: ink.strong },
  weekRow: { flexDirection: 'row' },
  week: { flex: 1, textAlign: 'center', ...font.regular, fontSize: 11, color: ink.muted, paddingVertical: 4 },
  sunday: { color: '#B4485A' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: ink.strong },
  dayText: { ...font.regular, fontSize: 14, color: ink.strong },
  futureText: { color: '#B5BEC8' },
  cellOn: { backgroundColor: ink.strong },
  cellOnText: { color: '#FFFFFF', ...font.bold },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  monthCell: { width: '25%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  monthText: { ...font.regular, fontSize: 14, color: ink.strong },
  disabled: { opacity: 0.3 },
});
