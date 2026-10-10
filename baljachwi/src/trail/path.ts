/**
 * The walked path. Footprints can sit anywhere across the ground; the faint
 * footsteps then wander from one footprint to the next in time order. Far from
 * any footprint the path falls back to a gentle default meander.
 */
import { dayIndex, parseISODate } from '@/domain/dates';
import type { Footprint } from '@/domain/types';
import { trailX, type TrailGeometry } from './layout';

export interface Anchor {
  id: string;
  /** Continuous time, days since 1970-01-01 (same `u` the month layout uses). */
  u: number;
  /** Absolute x in the section. */
  x: number;
}

/** How many days the path takes to ease from a footprint back into the default meander. */
const EASE_DAYS = 18;
const EDGE = 0.06;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Absolute x of a footprint placed by hand (stored as a 0–1 fraction of the column). */
export function placedX(fraction: number, g: TrailGeometry): number {
  // Keep a whole print on the ground, never half off the edge.
  const margin = Math.max(EDGE * g.contentW, 34);
  return clamp(g.offsetX + fraction * g.contentW, g.offsetX + margin, g.offsetX + g.contentW - margin);
}

/** Time of each footprint, matching the month layout: one slot per day, later-created ones a hair newer. */
export function footprintTimes(footprints: Footprint[]): Map<string, number> {
  const sorted = [...footprints].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );
  const out = new Map<string, number>();
  let lastDate = '';
  let n = 0;
  for (const f of sorted) {
    n = f.date === lastDate ? n + 1 : 0;
    lastDate = f.date;
    out.set(f.id, dayIndex(parseISODate(f.date)) + 0.5 - n * 0.02);
  }
  return out;
}

/** Anchors in ascending time. Footprints without a chosen spot sit on the default meander. */
export function buildAnchors(footprints: Footprint[], g: TrailGeometry): Anchor[] {
  const times = footprintTimes(footprints);
  return footprints
    .map((f) => {
      const u = times.get(f.id)!;
      return { id: f.id, u, x: f.x === undefined ? trailX(u, g) : placedX(f.x, g) };
    })
    .sort((a, b) => a.u - b.u);
}

export type PathX = (u: number) => number;

export function makePathX(anchors: Anchor[], g: TrailGeometry): PathX {
  const base = (u: number) => trailX(u, g);
  if (anchors.length === 0) return base;
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  const pts: Anchor[] = [
    { id: 'start', u: first.u - EASE_DAYS, x: base(first.u - EASE_DAYS) },
    ...anchors,
    { id: 'end', u: last.u + EASE_DAYS, x: base(last.u + EASE_DAYS) },
  ];
  const lo = g.offsetX + Math.max(EDGE * g.contentW, 34);
  const hi = g.offsetX + g.contentW - Math.max(EDGE * g.contentW, 34);

  return (u: number) => {
    if (u <= pts[0].u || u >= pts[pts.length - 1].u) return base(u);
    let a = 0;
    let b = pts.length - 1;
    while (b - a > 1) {
      const mid = (a + b) >> 1;
      if (pts[mid].u <= u) a = mid;
      else b = mid;
    }
    const p0 = pts[a];
    const p1 = pts[b];
    const du = p1.u - p0.u;
    if (du <= 0) return p1.x;
    const t = (u - p0.u) / du;
    const s = t * t * (3 - 2 * t);
    // A little wander between footprints that vanishes at each footprint.
    const wander = Math.sin(Math.PI * t) * g.contentW * 0.05 * Math.sin(u / 4.5) * Math.min(1, du / 12);
    return clamp(p0.x + (p1.x - p0.x) * s + wander, lo, hi);
  };
}

/** The anchors that shape the path through `[uBottom, uTop]`: those inside plus the nearest on each side. */
export function anchorsAround(anchors: Anchor[], uBottom: number, uTop: number): Anchor[] {
  let i = 0;
  while (i < anchors.length && anchors[i].u < uBottom) i += 1;
  let j = i;
  while (j < anchors.length && anchors[j].u <= uTop) j += 1;
  return anchors.slice(Math.max(0, i - 1), Math.min(anchors.length, j + 1));
}
