import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FootprintSheet, SHEET_RESERVE } from '@/components/FootprintSheet';
import { GAP_H, GapSection } from '@/components/GapSection';
import { groundOf, monthGround, monthOfKey } from '@/components/ground';
import { COACH_ROOM, MonthSection } from '@/components/MonthSection';
import { START_H, StartSection } from '@/components/StartSection';
import { MAX_CONTENT_W } from '@/components/theme';
import { Toast, type ToastMessage } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { GHOST_H, TOPBAR_H, TrailHead, nextSeasonOf } from '@/components/TrailHead';
import { compareISO, dayIndex, daysInMonth, formatISO, fromMonthKey, monthKey, parseISODate, todayISO, weekday } from '@/domain/dates';
import { STEPS, countSteps, levelForSteps } from '@/domain/level';
import { withJosa } from '@/domain/korean';
import { SEASONS } from '@/domain/seasons';
import type { Footprint, FootprintDraft } from '@/domain/types';
import { useFootprints } from '@/store/footprints';
import { layoutMonth, type MonthLayout, type TrailGeometry } from '@/trail/layout';
import { anchorsAround, buildAnchors, makePathX } from '@/trail/path';
import { buildTimeline, type TimelineItem } from '@/trail/timeline';

const DRAFT_ID = '__draft__';
/** Where a footprint being written settles on screen, above the sheet. */
const FOCUS_FROM_TOP = 150;

type Sheet = { mode: 'new'; draft: FootprintDraft } | { mode: 'edit'; id: string; draft: FootprintDraft };

interface Row {
  item: TimelineItem;
  height: number;
  layout?: MonthLayout;
}

/** Laid-out months, shared across renders; a month is recomputed only when its footprints change. */
const layoutCache = new Map<string, MonthLayout>();

const monthLabel = (key: number) => {
  const { y, m } = fromMonthKey(key);
  return `${y}년 ${m}월`;
};

export default function TrailScreen() {
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const footprints = useFootprints((s) => s.footprints);
  const hydrated = useFootprints((s) => s.hydrated);
  const add = useFootprints((s) => s.add);
  const update = useFootprints((s) => s.update);
  const remove = useFootprints((s) => s.remove);
  const loadSamples = useFootprints((s) => s.loadSamples);

  const listRef = useRef<FlatList<Row>>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  const [extraYears, setExtraYears] = useState(0);
  const [stampId, setStampId] = useState<string | undefined>();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [whereKey, setWhereKey] = useState<number | null>(null);

  const today = todayISO();
  const todayYMD = useMemo(() => parseISODate(today), [today]);
  const topKey = monthKey(todayYMD.y, todayYMD.m);
  const contentW = Math.min(width, MAX_CONTENT_W);
  const geometry: TrailGeometry = useMemo(() => ({ contentW, offsetX: (width - contentW) / 2, fullW: width }), [contentW, width]);
  const showCoach = hydrated && footprints.length === 0 && !sheet;

  // What the trail draws: saved footprints plus the one being written, live.
  const shown = useMemo<Footprint[]>(() => {
    if (!sheet) return footprints;
    if (sheet.mode === 'new') {
      return [...footprints, { ...sheet.draft, id: DRAFT_ID, createdAt: '9999-12-31', updatedAt: '' }];
    }
    return footprints.map((f) => (f.id === sheet.id ? { ...f, ...sheet.draft } : f));
  }, [footprints, sheet]);
  const highlightId = sheet ? (sheet.mode === 'new' ? DRAFT_ID : sheet.id) : undefined;

  // The walked path runs through every footprint, wherever it was stamped.
  const anchors = useMemo(() => buildAnchors(shown, geometry), [shown, geometry]);
  const pathX = useMemo(() => makePathX(anchors, geometry), [anchors, geometry]);
  const xAtMonthStart = useCallback(
    (key: number) => {
      const { y, m } = fromMonthKey(key);
      return pathX(dayIndex({ y, m, d: 1 }));
    },
    [pathX],
  );

  const byMonth = useMemo(() => {
    const map = new Map<number, Footprint[]>();
    for (const f of shown) {
      const { y, m } = parseISODate(f.date);
      const key = monthKey(y, m);
      map.set(key, [...(map.get(key) ?? []), f]);
    }
    return map;
  }, [shown]);

  const layoutFor = useCallback(
    (key: number) => {
      const list = byMonth.get(key) ?? [];
      const coach = key === topKey && showCoach;
      const { y, m } = fromMonthKey(key);
      const uBottom = dayIndex({ y, m, d: 1 });
      const shaping = anchorsAround(anchors, uBottom, uBottom + daysInMonth(y, m));
      const sig = [
        key,
        width,
        today,
        coach,
        list.map((f) => `${f.id}:${f.date}:${f.size}:${f.category}:${f.title}:${f.note ?? ''}`).join('|'),
        shaping.map((a) => `${a.u.toFixed(2)}:${a.x.toFixed(1)}`).join('|'),
      ].join('#');
      const hit = layoutCache.get(sig);
      if (hit) return hit;
      const layout = layoutMonth({ year: y, month: m, footprints: list, today: todayYMD, geometry, nowRoom: coach ? COACH_ROOM : 0, pathX });
      if (layoutCache.size > 400) layoutCache.clear();
      layoutCache.set(sig, layout);
      return layout;
    },
    [byMonth, topKey, showCoach, width, today, todayYMD, geometry, anchors, pathX],
  );

  const filled = useMemo(() => new Set(byMonth.keys()), [byMonth]);
  const oldestKey = filled.size ? Math.min(...filled) : topKey;
  const bottomKey = Math.min(oldestKey, topKey - 11) - extraYears * 12;
  const oldestSaved = useMemo(() => footprints.reduce<string | null>((min, f) => (min === null || f.date < min ? f.date : min), null), [footprints]);

  const rows = useMemo<Row[]>(() => {
    const items = buildTimeline({ topKey, bottomKey, filled, opened });
    return items.map((item) => {
      if (item.kind === 'head') return { item, height: insets.top + TOPBAR_H + GHOST_H };
      if (item.kind === 'month') {
        const layout = layoutFor(item.monthKey);
        return { item, height: layout.height, layout };
      }
      if (item.kind === 'gap') return { item, height: GAP_H };
      return { item, height: START_H + insets.bottom };
    });
  }, [topKey, bottomKey, filled, opened, layoutFor, insets.top, insets.bottom]);

  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const r of rows) {
      out.push(acc);
      acc += r.height;
    }
    return out;
  }, [rows]);

  const scrollY = useRef(0);
  const rowsRef = useRef({ rows, offsets });
  useEffect(() => {
    rowsRef.current = { rows, offsets };
  }, [rows, offsets]);

  const level = useMemo(() => levelForSteps(countSteps(footprints)), [footprints]);

  // Keep the footprint being written in view, just above the sheet.
  const focusKey = sheet ? `${sheet.mode}|${highlightId}|${sheet.draft.date}|${sheet.draft.size}` : null;
  useEffect(() => {
    if (!focusKey || !highlightId) return;
    const { rows: rs, offsets: os } = rowsRef.current;
    const index = rs.findIndex((r) => r.layout?.entries.some((e) => e.footprint.id === highlightId));
    if (index < 0) return;
    const entry = rs[index].layout!.entries.find((e) => e.footprint.id === highlightId)!;
    const onScreen = os[index] + entry.y - scrollY.current;
    // Leave the view alone when the footprint is already visible above the sheet.
    if (onScreen > insets.top + TOPBAR_H + 40 && onScreen < screenH - SHEET_RESERVE - 30) return;
    const offset = Math.max(0, os[index] + entry.y - FOCUS_FROM_TOP - insets.top);
    const id = setTimeout(() => listRef.current?.scrollToOffset({ offset, animated: true }), 60);
    return () => clearTimeout(id);
  }, [focusKey, highlightId, insets.top, screenH]);

  const say = useCallback((title: string, detail?: string) => setToast({ id: Date.now(), title, detail }), []);

  const openNew = useCallback(
    (date: string, x?: number) => {
      const last = [...footprints].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setStampId(undefined);
      setSheet({ mode: 'new', draft: { date, x, size: last?.size ?? 'big', category: last?.category ?? 'project', title: '', note: '' } });
    },
    [footprints],
  );
  const openEdit = useCallback((f: Footprint) => {
    if (f.id === DRAFT_ID) return;
    setStampId(undefined);
    setSheet((open) =>
      open ? open : { mode: 'edit', id: f.id, draft: { date: f.date, x: f.x, size: f.size, category: f.category, title: f.title, note: f.note ?? '' } },
    );
  }, []);

  // Bare ground: start a footprint there, or move the one being written.
  const onPressGround = useCallback(
    (date: string, x: number) => {
      if (compareISO(date, today) > 0) return;
      if (sheet) setSheet({ ...sheet, draft: { ...sheet.draft, date, x } });
      else openNew(date, x);
    },
    [sheet, today, openNew],
  );

  const onSave = useCallback(() => {
    if (!sheet) return;
    const before = levelForSteps(countSteps(footprints));
    if (sheet.mode === 'new') {
      const saved = add(sheet.draft);
      setStampId(saved.id);
      const after = levelForSteps(before.steps + STEPS[saved.size]);
      if (after.level > before.level) say(`Lv.${after.level} ${withJosa(after.name, '이', '가')} 되었어요`, `+${STEPS[saved.size]}걸음`);
      else say('발자국을 남겼어요', `+${STEPS[saved.size]}걸음`);
    } else {
      update(sheet.id, sheet.draft);
      setStampId(sheet.id);
      say('발자국을 고쳤어요');
    }
    setSheet(null);
  }, [sheet, footprints, add, update, say]);

  const onDelete = useCallback(() => {
    if (sheet?.mode !== 'edit') return;
    remove(sheet.id);
    setSheet(null);
    say('발자국을 지웠어요');
  }, [sheet, remove, say]);

  const onPressLevel = useCallback(() => {
    if (level.next === null) say(`Lv.${level.level} ${level.name}`, `${level.steps}걸음`);
    else say(`Lv.${level.level + 1} ${level.nextName}까지 ${level.next - level.steps}걸음`, `지금 ${level.steps}걸음`);
  }, [level, say]);

  const openGap = useCallback((newestKey: number, oldestKey: number) => {
    setOpened((prev) => {
      const next = new Set(prev);
      for (let k = newestKey; k >= oldestKey; k--) next.add(k);
      return next;
    });
  }, []);

  const addEarlier = useCallback(() => {
    const { y, m } = fromMonthKey(bottomKey - 1);
    openNew(formatISO({ y, m, d: Math.min(15, daysInMonth(y, m)) }));
  }, [bottomKey, openNew]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollY.current = y;
      if (y < 600) return setWhereKey((k) => (k === null ? k : null));
      const probe = y + insets.top + TOPBAR_H + 20;
      const { rows: rs, offsets: os } = rowsRef.current;
      let i = 0;
      while (i + 1 < os.length && os[i + 1] <= probe) i += 1;
      const item = rs[i]?.item;
      const key = item?.kind === 'month' ? item.monthKey : item?.kind === 'gap' ? item.newestKey : item?.kind === 'start' ? item.bottomKey : null;
      setWhereKey((k) => (k === key ? k : key));
    },
    [insets.top],
  );

  const todayLabel = `${todayYMD.m}월 ${todayYMD.d}일 ${weekday(today)}요일`;
  const topBarGround = whereKey === null ? SEASONS[nextSeasonOf(todayYMD.m)].ground : groundOf(monthOfKey(whereKey));

  const renderItem = ({ item: row }: { item: Row }) => {
    const it = row.item;
    if (it.kind === 'head') {
      return (
        <TrailHead
          month={todayYMD.m}
          topX={rows[1]?.layout?.topX ?? width / 2}
          fullW={width}
          offsetX={geometry.offsetX}
          contentW={contentW}
          insetTop={insets.top}
        />
      );
    }
    if (it.kind === 'month' && row.layout) {
      return (
        <MonthSection
          layout={row.layout}
          fullW={width}
          offsetX={geometry.offsetX}
          contentW={contentW}
          todayLabel={todayLabel}
          highlightId={row.layout.entries.some((e) => e.footprint.id === highlightId) ? highlightId : undefined}
          stampId={stampId}
          showCoach={it.monthKey === topKey && showCoach}
          onPressGround={onPressGround}
          onPressEntry={openEdit}
          onPressNow={() => openNew(today)}
          onSample={loadSamples}
        />
      );
    }
    if (it.kind === 'gap') {
      return (
        <GapSection
          newestKey={it.newestKey}
          oldestKey={it.oldestKey}
          count={it.count}
          topX={xAtMonthStart(it.newestKey + 1)}
          bottomX={xAtMonthStart(it.oldestKey)}
          fullW={width}
          onOpen={() => openGap(it.newestKey, it.oldestKey)}
        />
      );
    }
    if (it.kind === 'start') {
      return (
        <StartSection
          bottomKey={it.bottomKey}
          oldestFootprint={oldestSaved}
          topX={xAtMonthStart(it.bottomKey)}
          fullW={width}
          insetBottom={insets.bottom}
          onAddEarlier={addEarlier}
          onGoFurther={() => setExtraYears((n) => n + 1)}
        />
      );
    }
    return null;
  };

  return (
    <View style={[styles.root, { backgroundColor: monthGround(todayYMD.m).top }]}>
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => r.item.id}
        renderItem={renderItem}
        extraData={`${highlightId}|${stampId}|${showCoach}`}
        getItemLayout={(_, index) => ({ length: rows[index].height, offset: offsets[index], index })}
        initialNumToRender={5}
        windowSize={9}
        onScroll={onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={{ paddingBottom: sheet ? SHEET_RESERVE + 160 : 0 }}
        showsVerticalScrollIndicator={false}
      />

      <TopBar
        ground={topBarGround}
        insetTop={insets.top}
        offsetX={geometry.offsetX}
        level={level}
        where={whereKey === null ? null : monthLabel(whereKey)}
        onPressLevel={onPressLevel}
        onBackToToday={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />

      {toast && <Toast key={toast.id} message={toast} top={insets.top + TOPBAR_H + 6} onDone={() => setToast(null)} />}

      {sheet && (
        <FootprintSheet
          key={sheet.mode === 'edit' ? sheet.id : 'new'}
          mode={sheet.mode}
          draft={sheet.draft}
          today={today}
          bottomInset={insets.bottom}
          onChange={(draft) => setSheet((s) => (s ? { ...s, draft } : s))}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
