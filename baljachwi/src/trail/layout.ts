/**
 * Pure layout engine for one month of the trail.
 *
 * The trail runs upward through time: the newest day sits at the top of the
 * screen and scrolling down walks back into the past. Every month is laid out
 * on its own, but the trail's horizontal position depends only on continuous
 * time (`u`, in days since 1970-01-01), so neighbouring months meet seamlessly.
 *
 * A month is only as tall as its content: an empty month is a short stretch of
 * path, and every footprint pushes the month open as far as it needs. A
 * piecewise-linear map between screen `y` and time `u` keeps each footprint
 * exactly on the trail at its own date.
 */
import { daysInMonth, dayIndex, fromDayIndex, formatISO, monthKey, parseISODate, type YMD } from '@/domain/dates';
import { SEASONS, isSeasonTop, seasonOf, type DecoKind, type Season } from '@/domain/seasons';
import type { Footprint } from '@/domain/types';
import { createRng } from './rng';

export const HEADER_H = 46;
/** Base height of one day; footprints push months open beyond this. */
const DAY_H = 2.2;
/** Body height of an empty month: room to tap and leave one footprint. */
const MIN_BODY = 70;
const STEP_SPACING = 30;
const PAD = 16;

export const NOW = { size: 48, offset: 30 } as const;

export const PRINT = {
  big: { w: 52, h: 52, labelOffset: 40, labelTop: 24 },
  small: { w: 15, h: 26, labelOffset: 26, labelTop: 13 },
} as const;

export const TITLE_PLACEHOLDER = '어떤 발자국인가요?';
const TITLE_MAX_LINES = 3;
const NOTE_MAX_LINES = 2;

export interface TrailGeometry {
  /** Width of the column the trail lives in. */
  contentW: number;
  /** Left edge of that column inside the full-width section. */
  offsetX: number;
  /** Full width of the section (decorations spread across it). */
  fullW: number;
}

export interface PlacedEntry {
  footprint: Footprint;
  x: number;
  y: number;
  rot: number;
  opacity: number;
  label: { left: number; top: number; width: number; height: number; align: 'left' | 'right' };
}

export interface Step {
  x: number;
  y: number;
  rot: number;
  opacity: number;
}

export interface Deco {
  x: number;
  y: number;
  size: number;
  rot: number;
  kind: DecoKind;
  color: string;
  opacity: number;
}

export interface MonthLayout {
  key: number;
  year: number;
  month: number;
  season: Season;
  isCurrent: boolean;
  lastDay: number;
  height: number;
  empty: boolean;
  showSeason: boolean;
  entries: PlacedEntry[];
  steps: Step[];
  decos: Deco[];
  stepColor: string;
  /** Center of the "you are here" button in the current month. */
  nowMarker: { x: number; y: number } | null;
  /** Trail x where this month meets the newer month above it. */
  topX: number;
  /** Trail x where this month meets the older month below it. */
  bottomX: number;
  /** `[y, u]` pairs, y ascending, u descending. */
  knots: [number, number][];
}

export interface MonthInput {
  year: number;
  month: number;
  footprints: Footprint[];
  today: YMD;
  geometry: TrailGeometry;
  /** Extra room under the "you are here" button (e.g. for a first-run hint). */
  nowRoom?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Horizontal trail position at time `u` — a slow, organic meander. */
export function trailX(u: number, g: TrailGeometry): number {
  const w = g.contentW;
  const x = w / 2 + w * 0.2 * Math.sin(u / 9) + w * 0.05 * Math.sin(u / 4 + 1.3);
  return g.offsetX + clamp(x, w * 0.24, w * 0.76);
}

/** Trail x at the very start of a calendar month (its border with the month before). */
export function trailXAtMonthStart(key: number, g: TrailGeometry): number {
  return trailX(dayIndex({ y: Math.floor(key / 12), m: (key % 12) + 1, d: 1 }), g);
}

export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) {
    if (/[ㄱ-ㆎ가-힣]/.test(ch)) w += size * 0.98;
    else if (/[A-Z0-9]/.test(ch)) w += size * 0.64;
    else if (ch === ' ') w += size * 0.3;
    else w += size * 0.54;
  }
  return w;
}

/** Conservative estimate of how many lines a label line will wrap to. */
export function estimateLines(text: string, size: number, width: number, max: number): number {
  if (!text) return 0;
  return clamp(Math.ceil(textWidth(text, size) / (width * 0.9)), 1, max);
}

export function labelHeight(f: Pick<Footprint, 'size' | 'title' | 'note'>, width: number): number {
  const title = f.title || TITLE_PLACEHOLDER;
  if (f.size === 'big') {
    const titleLines = estimateLines(title, 18, width, TITLE_MAX_LINES);
    const noteLines = estimateLines(f.note ?? '', 13, width, NOTE_MAX_LINES);
    return 17 + 5 + titleLines * 24 + (noteLines ? 5 + noteLines * 20 : 0);
  }
  const titleLines = estimateLines(title, 14, width, TITLE_MAX_LINES);
  return titleLines * 20 + 3 + 17;
}

export function yToU(knots: [number, number][], y: number): number {
  if (y <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [y1, u1] = knots[i];
    if (y <= y1) {
      const [y0, u0] = knots[i - 1];
      return y1 === y0 ? u1 : u0 + ((y - y0) / (y1 - y0)) * (u1 - u0);
    }
  }
  return knots[knots.length - 1][1];
}

/** The calendar date a tap at `y` inside a month points to. */
export function dateAtY(layout: MonthLayout, y: number): string {
  const first = dayIndex({ y: layout.year, m: layout.month, d: 1 });
  const last = first + layout.lastDay - 1;
  const index = clamp(Math.floor(yToU(layout.knots, y)), first, last);
  return formatISO(fromDayIndex(index));
}

export function layoutMonth({ year, month, footprints, today, geometry: g, nowRoom = 0 }: MonthInput): MonthLayout {
  const key = monthKey(year, month);
  const todayKey = monthKey(today.y, today.m);
  const isCurrent = key === todayKey;
  const lastDay = isCurrent ? today.d : daysInMonth(year, month);
  const uTop = dayIndex({ y: year, m: month, d: lastDay }) + 1;
  const uBottom = dayIndex({ y: year, m: month, d: 1 });
  const season = seasonOf(month);
  const seasonMeta = SEASONS[season];
  const center = g.offsetX + g.contentW / 2;
  const minBody = isCurrent ? NOW.offset + NOW.size / 2 + 30 + nowRoom : MIN_BODY;
  const dayH = Math.max(DAY_H, minBody / lastDay);
  const naturalY = (u: number) => HEADER_H + (uTop - u) * dayH;
  const ageFade = Math.max(0.55, 1 - Math.max(0, todayKey - key) * 0.03);

  // Newest first; footprints created later on the same day sit higher.
  const sorted = footprints
    .filter((f) => {
      const p = parseISODate(f.date);
      return p.y === year && p.m === month;
    })
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));

  const entries: PlacedEntry[] = [];
  const knots: [number, number][] = [
    [0, uTop],
    [HEADER_H, uTop],
  ];
  const firstFloor = isCurrent ? HEADER_H + NOW.offset + NOW.size / 2 + 20 + nowRoom : HEADER_H + 10;
  let prev: { y: number; big: boolean } | null = null;
  const lastLabelBottom = { left: firstFloor - 10, right: firstFloor - 10 };
  let sameDayIndex = 0;
  let lastDate = '';

  for (const f of sorted) {
    sameDayIndex = f.date === lastDate ? sameDayIndex + 1 : 0;
    lastDate = f.date;
    const day = Math.min(parseISODate(f.date).d, lastDay);
    const u = dayIndex({ y: year, m: month, d: day }) + 0.5 - sameDayIndex * 0.02;
    const big = f.size === 'big';
    const spec = big ? PRINT.big : PRINT.small;
    const x0 = trailX(u, g);
    const align: 'left' | 'right' = x0 > center ? 'right' : 'left';
    const onLeft = align === 'right';
    const left = onLeft ? g.offsetX + PAD : x0 + spec.labelOffset;
    const width = Math.max(96, onLeft ? x0 - spec.labelOffset - left : g.offsetX + g.contentW - PAD - left);
    const height = labelHeight(f, width);
    const side = onLeft ? 'left' : 'right';

    let y = Math.max(naturalY(u), firstFloor + spec.labelTop);
    if (prev) {
      const gap = prev.big && big ? 60 : prev.big || big ? 44 : 32;
      y = Math.max(y, prev.y + gap);
    }
    y = Math.max(y, lastLabelBottom[side] + 12 + spec.labelTop);

    const top = y - spec.labelTop;
    lastLabelBottom[side] = top + height;
    prev = { y, big };
    knots.push([y, u]);
    entries.push({ footprint: f, x: x0, y, rot: 0, opacity: ageFade, label: { left, top, width, height, align } });
  }

  const contentBottom = Math.max(
    lastLabelBottom.left,
    lastLabelBottom.right,
    entries.length ? entries[entries.length - 1].y + 34 : 0,
  );
  const height = Math.ceil(Math.max(HEADER_H + lastDay * dayH, contentBottom + 22));
  knots.push([height, uBottom]);

  const xAt = (y: number) => trailX(yToU(knots, y), g);
  const rotAt = (y: number) => {
    // Toes point up the screen, toward newer days.
    const vx = xAt(y - 3) - xAt(y + 3);
    return (Math.atan2(-6, vx) * 180) / Math.PI + 90;
  };
  for (const e of entries) e.rot = rotAt(e.y);

  const nowY = HEADER_H + NOW.offset;
  const nowMarker = isCurrent ? { x: xAt(nowY), y: nowY } : null;
  const showSeason = isCurrent || isSeasonTop(month);
  const empty = entries.length === 0;

  // Keep footsteps off the month heading and the season tag.
  const headerTextW = textWidth(`${month}월`, 16) + 8 + textWidth(String(year), 12);
  const headerBlocks = [{ x0: g.offsetX + 12, y0: 0, x1: g.offsetX + 28 + headerTextW, y1: HEADER_H - 6 }];
  if (showSeason) headerBlocks.push({ x0: g.offsetX + g.contentW - 80, y0: 0, x1: g.offsetX + g.contentW, y1: HEADER_H - 6 });

  const stepOpacity = ageFade * (empty ? 0.62 : 1) * 0.95;
  const steps: Step[] = [];
  const blockedBySteps = (x: number, y: number) =>
    entries.some((e) => Math.hypot(e.x - x, e.y - y) < (e.footprint.size === 'big' ? 38 : 22)) ||
    (nowMarker !== null && Math.hypot(nowMarker.x - x, nowMarker.y - y) < NOW.size / 2 + 10) ||
    headerBlocks.some((b) => x > b.x0 - 6 && x < b.x1 + 6 && y > b.y0 && y < b.y1 + 8);
  let acc = STEP_SPACING / 2;
  let px = xAt(0);
  let parity = (uTop & 1) === 0 ? 1 : -1;
  for (let y = 2; y <= height; y += 2) {
    const x = xAt(y);
    acc += Math.hypot(x - px, 2);
    px = x;
    if (acc < STEP_SPACING) continue;
    acc = 0;
    parity = -parity;
    const rot = rotAt(y);
    const rad = ((rot - 90) * Math.PI) / 180;
    const sx = x - Math.sin(rad) * parity * 7;
    const sy = y + Math.cos(rad) * parity * 7;
    if (blockedBySteps(sx, sy)) continue;
    steps.push({ x: sx, y: sy, rot, opacity: stepOpacity });
  }

  // Seasonal ground cover, kept off the trail and away from text.
  const rng = createRng(key * 7919 + 17);
  const blocks = entries.flatMap((e) => {
    const spec = e.footprint.size === 'big' ? PRINT.big : PRINT.small;
    return [
      { x0: e.label.left, y0: e.label.top, x1: e.label.left + e.label.width, y1: e.label.top + e.label.height },
      { x0: e.x - spec.w / 2, y0: e.y - spec.h / 2, x1: e.x + spec.w / 2, y1: e.y + spec.h / 2 },
    ];
  });
  blocks.push({ x0: 0, y0: 0, x1: g.fullW, y1: HEADER_H - 4 });
  if (nowMarker) {
    blocks.push({ x0: nowMarker.x - 120, y0: nowMarker.y - 30, x1: nowMarker.x + 120, y1: nowMarker.y + 30 + nowRoom });
  }
  // Sparser on wide screens so the margins stay calm.
  const target = Math.round((height * Math.min(g.fullW, g.contentW + 260)) / 7600);
  const decos: Deco[] = [];
  for (let tries = 0; decos.length < target && tries < target * 10; tries++) {
    const kind = rng.pick(seasonMeta.decoKinds);
    const size = kind === 'petal' ? 8 + rng.next() * 5 : kind === 'flake' ? 9 + rng.next() * 5 : kind === 'flower' ? 11 + rng.next() * 5 : 12 + rng.next() * 7;
    const x = 4 + rng.next() * (g.fullW - 8 - size);
    const y = HEADER_H + 2 + rng.next() * Math.max(1, height - HEADER_H - 4 - size);
    const cx = x + size / 2;
    const cy = y + size / 2;
    if (Math.abs(xAt(cy) - cx) < 30) continue;
    if (blocks.some((b) => cx + size / 2 > b.x0 - 6 && cx - size / 2 < b.x1 + 6 && cy + size / 2 > b.y0 - 6 && cy - size / 2 < b.y1 + 6)) continue;
    if (decos.some((d) => Math.hypot(d.x + d.size / 2 - cx, d.y + d.size / 2 - cy) < 18)) continue;
    decos.push({
      x,
      y,
      size,
      rot: kind === 'grass' ? rng.next() * 20 - 10 : rng.next() * 360,
      kind,
      color: kind === 'flower' ? (season === 'spring' ? '#F2B8C8' : '#FFFFFF') : rng.pick(seasonMeta.decoColors),
      opacity: 0.55 + rng.next() * 0.35,
    });
  }

  return {
    key,
    year,
    month,
    season,
    isCurrent,
    lastDay,
    height,
    empty,
    showSeason,
    entries,
    steps,
    decos,
    stepColor: seasonMeta.step,
    nowMarker,
    topX: xAt(0),
    bottomX: xAt(height),
    knots,
  };
}
