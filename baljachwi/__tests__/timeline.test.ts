import { monthKey } from '@/domain/dates';
import { buildTimeline } from '@/trail/timeline';

const top = monthKey(2026, 10);

const kinds = (items: ReturnType<typeof buildTimeline>) =>
  items.map((i) => (i.kind === 'month' ? `m${i.monthKey - top}` : i.kind === 'gap' ? `gap${i.count}` : i.kind));

describe('buildTimeline', () => {
  it('always shows the current month and ends at the start', () => {
    const items = buildTimeline({ topKey: top, bottomKey: top, filled: new Set(), opened: new Set() });
    expect(kinds(items)).toEqual(['head', 'm0', 'start']);
  });

  it('folds three or more empty months into one stretch', () => {
    const filled = new Set([top - 1, top - 5]);
    const items = buildTimeline({ topKey: top, bottomKey: top - 6, filled, opened: new Set() });
    expect(kinds(items)).toEqual(['head', 'm0', 'm-1', 'gap3', 'm-5', 'm-6', 'start']);
  });

  it('keeps short empty runs as real months', () => {
    const filled = new Set([top - 3]);
    const items = buildTimeline({ topKey: top, bottomKey: top - 3, filled, opened: new Set() });
    expect(kinds(items)).toEqual(['head', 'm0', 'm-1', 'm-2', 'm-3', 'start']);
  });

  it('unfolds a stretch the walker opened', () => {
    const filled = new Set([top - 6]);
    const opened = new Set([top - 1, top - 2, top - 3, top - 4, top - 5]);
    const items = buildTimeline({ topKey: top, bottomKey: top - 6, filled, opened });
    expect(kinds(items)).toEqual(['head', 'm0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'start']);
  });

  it('skips years between an old footprint and recent ones', () => {
    const old = monthKey(2019, 5);
    const filled = new Set([top - 2, old]);
    const items = buildTimeline({ topKey: top, bottomKey: old, filled, opened: new Set() });
    const gap = items.find((i) => i.kind === 'gap');
    expect(gap && gap.kind === 'gap' && gap.count).toBe(top - 3 - old);
    expect(kinds(items).slice(-2)).toEqual([`m${old - top}`, 'start']);
  });
});
