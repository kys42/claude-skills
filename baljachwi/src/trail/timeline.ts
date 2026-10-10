/**
 * Decides which months the trail shows. Months with footprints, the current
 * month and anything the walker opened up stay visible; long runs of empty
 * months fold into a single "⋯" stretch that can be opened later.
 */

export type TimelineItem =
  | { kind: 'head'; id: 'head' }
  | { kind: 'month'; id: string; monthKey: number }
  | { kind: 'gap'; id: string; newestKey: number; oldestKey: number; count: number }
  | { kind: 'start'; id: 'start'; bottomKey: number };

export interface TimelineInput {
  /** The current month (always shown). */
  topKey: number;
  /** The oldest month on the trail. */
  bottomKey: number;
  /** Months that hold at least one footprint. */
  filled: ReadonlySet<number>;
  /** Months the walker unfolded. */
  opened: ReadonlySet<number>;
  /** Empty runs at least this long fold into a gap. */
  minGap?: number;
}

export function buildTimeline({ topKey, bottomKey, filled, opened, minGap = 3 }: TimelineInput): TimelineItem[] {
  const items: TimelineItem[] = [{ kind: 'head', id: 'head' }];
  let run: number[] = [];

  const flush = () => {
    if (run.length >= minGap) {
      const newestKey = run[0];
      const oldestKey = run[run.length - 1];
      items.push({ kind: 'gap', id: `gap-${newestKey}-${oldestKey}`, newestKey, oldestKey, count: run.length });
    } else {
      for (const k of run) items.push({ kind: 'month', id: `m-${k}`, monthKey: k });
    }
    run = [];
  };

  for (let k = topKey; k >= bottomKey; k--) {
    const visible = k === topKey || filled.has(k) || opened.has(k);
    if (visible) {
      flush();
      items.push({ kind: 'month', id: `m-${k}`, monthKey: k });
    } else {
      run.push(k);
    }
  }
  flush();
  items.push({ kind: 'start', id: 'start', bottomKey });
  return items;
}
