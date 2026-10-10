import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { MonthSection } from '@/components/MonthSection';
import { TrailHead } from '@/components/TrailHead';
import { MAX_CONTENT_W, font, ink } from '@/components/theme';
import { fromMonthKey, monthKey, parseISODate, todayISO } from '@/domain/dates';
import { countSteps, levelForSteps } from '@/domain/level';
import type { Footprint } from '@/domain/types';
import { useFootprints } from '@/store/footprints';
import { layoutMonth, type MonthLayout, type TrailGeometry } from '@/trail/layout';

const INITIAL_MONTHS = 18;
const MORE_MONTHS = 12;

export default function TrailScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const footprints = useFootprints((s) => s.footprints);
  const hydrated = useFootprints((s) => s.hydrated);
  const loadSamples = useFootprints((s) => s.loadSamples);
  const listRef = useRef<FlatList<MonthLayout>>(null);

  const [monthCount, setMonthCount] = useState(INITIAL_MONTHS);
  const [scrolledFar, setScrolledFar] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number } | null>(null);

  const today = todayISO();
  const todayYMD = parseISODate(today);
  const contentW = Math.min(width, MAX_CONTENT_W);
  const geometry: TrailGeometry = useMemo(
    () => ({ contentW, offsetX: (width - contentW) / 2, fullW: width }),
    [contentW, width],
  );

  const byMonth = useMemo(() => {
    const map = new Map<number, Footprint[]>();
    for (const f of footprints) {
      const { y, m } = parseISODate(f.date);
      const key = monthKey(y, m);
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return map;
  }, [footprints]);

  const layouts = useMemo(() => {
    const top = monthKey(todayYMD.y, todayYMD.m);
    return Array.from({ length: monthCount }, (_, i) => {
      const { y, m } = fromMonthKey(top - i);
      return layoutMonth({ year: y, month: m, footprints: byMonth.get(top - i) ?? [], today: todayYMD, geometry });
    });
    // todayYMD is derived from `today`, which is a stable string for the day.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byMonth, monthCount, geometry, today]);

  const level = useMemo(() => levelForSteps(countSteps(footprints)), [footprints]);
  const bigCount = footprints.filter((f) => f.size === 'big').length;

  const openEditor = useCallback((params: { date?: string; id?: string }) => {
    router.push({ pathname: '/editor', params });
  }, []);
  const onPressDate = useCallback((date: string) => openEditor({ date }), [openEditor]);
  const onPressEntry = useCallback((f: Footprint) => openEditor({ id: f.id }), [openEditor]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolledFar(e.nativeEvent.contentOffset.y > 900);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<MonthLayout>[] }) => {
    const first = viewableItems.find((v) => v.item);
    setVisibleMonth(first?.item ? { year: first.item.year, month: first.item.month } : null);
  }, []);

  const header = (
    <TrailHead
      today={today}
      level={level}
      bigCount={bigCount}
      smallCount={footprints.length - bigCount}
      showEmpty={hydrated && footprints.length === 0}
      topX={layouts[0]?.topX ?? width / 2}
      fullW={width}
      offsetX={geometry.offsetX}
      contentW={contentW}
      insetTop={insets.top}
      onAddToday={() => openEditor({ date: today })}
      onLoadSamples={loadSamples}
    />
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={layouts}
        keyExtractor={(l) => String(l.key)}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <MonthSection layout={item} fullW={width} offsetX={geometry.offsetX} onPressDate={onPressDate} onPressEntry={onPressEntry} />
        )}
        onEndReached={() => setMonthCount((c) => c + MORE_MONTHS)}
        onEndReachedThreshold={1.5}
        initialNumToRender={3}
        windowSize={7}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      />

      {scrolledFar && visibleMonth && (
        <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + 10 }]}>
          <Pressable
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
            accessibilityRole="button"
            accessibilityLabel="오늘로 돌아가기"
            style={({ pressed }) => [styles.whenChip, pressed && styles.pressed]}>
            <Text style={styles.whenText}>
              {visibleMonth.year}년 {visibleMonth.month}월
            </Text>
            <Text style={styles.whenBack}>오늘로 ↑</Text>
          </Pressable>
        </View>
      )}

      <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: insets.bottom + 22 }]}>
        <Pressable
          onPress={() => openEditor({ date: today })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
          </Svg>
          <Text style={styles.fabText}>발자국 남기기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F5F8' },
  topBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  whenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#D3DCE5',
    shadowColor: '#1F2A36',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  whenText: { ...font.bold, fontSize: 14, color: ink.strong },
  whenBack: { ...font.regular, fontSize: 12, color: ink.muted },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 26,
    borderRadius: 26,
    backgroundColor: ink.strong,
    shadowColor: '#1F2A36',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fabText: { ...font.bold, fontSize: 16, color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
});
