import { dayIndex } from '@/domain/dates';
import type { Footprint } from '@/domain/types';
import { HEADER_H, dateAtY, layoutMonth, trailX, yToU, type TrailGeometry } from '@/trail/layout';

const geometry: TrailGeometry = { contentW: 390, offsetX: 0, fullW: 390 };
const today = { y: 2026, m: 10, d: 10 };

let n = 0;
function fp(date: string, size: 'big' | 'small', title = '발자국'): Footprint {
  n += 1;
  return { id: `f${n}`, date, size, category: 'project', title, createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`, updatedAt: '' };
}

describe('layoutMonth', () => {
  it('stops the current month at today', () => {
    const layout = layoutMonth({ year: 2026, month: 10, footprints: [], today, geometry });
    expect(layout.isCurrent).toBe(true);
    expect(layout.lastDay).toBe(10);
    expect(layout.nowMarker).not.toBeNull();
    expect(layout.empty).toBe(true);
  });

  it('places footprints newest first, exactly on the trail', () => {
    const footprints = [fp('2026-09-03', 'small'), fp('2026-09-16', 'big'), fp('2026-09-28', 'small')];
    const layout = layoutMonth({ year: 2026, month: 9, footprints, today, geometry });
    expect(layout.entries.map((e) => e.footprint.date)).toEqual(['2026-09-28', '2026-09-16', '2026-09-03']);
    for (const e of layout.entries) {
      const u = yToU(layout.knots, e.y);
      expect(Math.abs(trailX(u, geometry) - e.x)).toBeLessThan(0.5);
    }
  });

  it('pushes crowded footprints apart so labels on the same side never overlap', () => {
    const footprints = Array.from({ length: 6 }, (_, i) => fp('2026-05-15', i % 2 ? 'big' : 'small', '아주 긴 제목이 들어가서 여러 줄로 넘어가는 발자국'));
    const layout = layoutMonth({ year: 2026, month: 5, footprints, today, geometry });
    for (const side of ['left', 'right'] as const) {
      const labels = layout.entries.filter((e) => e.label.align === side).map((e) => e.label);
      for (let i = 1; i < labels.length; i++) {
        expect(labels[i].top).toBeGreaterThanOrEqual(labels[i - 1].top + labels[i - 1].height);
      }
    }
    expect(layout.height).toBeGreaterThan(HEADER_H + 6 * 60);
  });

  it('meets the next month seamlessly', () => {
    const sep = layoutMonth({ year: 2026, month: 9, footprints: [], today, geometry });
    const aug = layoutMonth({ year: 2026, month: 8, footprints: [], today, geometry });
    const bottomOfSep = trailX(yToU(sep.knots, sep.height), geometry);
    expect(Math.abs(bottomOfSep - aug.topX)).toBeLessThan(0.5);
  });

  it('maps a tap back to a date inside the month', () => {
    const layout = layoutMonth({ year: 2026, month: 9, footprints: [], today, geometry });
    expect(dateAtY(layout, 0)).toBe('2026-09-30');
    expect(dateAtY(layout, layout.height)).toBe('2026-09-01');
    const mid = dateAtY(layout, layout.height / 2);
    expect(dayIndex({ y: 2026, m: 9, d: Number(mid.slice(8)) })).toBeGreaterThan(dayIndex({ y: 2026, m: 9, d: 5 }));
  });

  it('keeps empty months short and lets footprints open them up', () => {
    const empty = layoutMonth({ year: 2026, month: 7, footprints: [], today, geometry });
    expect(empty.height).toBeLessThan(140);
    const one = layoutMonth({ year: 2026, month: 7, footprints: [fp('2026-07-10', 'big', '여름의 큰 발자국')], today, geometry });
    expect(one.height).toBeGreaterThan(empty.height);
    const three = layoutMonth({
      year: 2026,
      month: 7,
      footprints: [fp('2026-07-10', 'big'), fp('2026-07-11', 'big'), fp('2026-07-12', 'small')],
      today,
      geometry,
    });
    expect(three.height).toBeGreaterThan(one.height);
  });

  it('leaves room under the "you are here" button before today\'s footprints', () => {
    const layout = layoutMonth({ year: 2026, month: 10, footprints: [fp('2026-10-10', 'big')], today, geometry });
    const now = layout.nowMarker!;
    expect(layout.entries[0].label.top).toBeGreaterThan(now.y + 20);
  });

  it('keeps footsteps clear of footprints', () => {
    const footprints = [fp('2026-09-16', 'big')];
    const layout = layoutMonth({ year: 2026, month: 9, footprints, today, geometry });
    const e = layout.entries[0];
    expect(layout.steps.length).toBeGreaterThan(5);
    for (const s of layout.steps) expect(Math.hypot(s.x - e.x, s.y - e.y)).toBeGreaterThanOrEqual(34);
  });
});
