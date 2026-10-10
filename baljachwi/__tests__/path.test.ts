import { dayIndex } from '@/domain/dates';
import type { Footprint } from '@/domain/types';
import { layoutMonth, trailX, yToU, type TrailGeometry } from '@/trail/layout';
import { buildAnchors, footprintTimes, makePathX, placedX } from '@/trail/path';

const g: TrailGeometry = { contentW: 390, offsetX: 0, fullW: 390 };
const today = { y: 2026, m: 10, d: 10 };

let n = 0;
function fp(date: string, x?: number, size: 'big' | 'small' = 'big'): Footprint {
  n += 1;
  return { id: `p${n}`, date, x, size, category: 'growth', title: '어디든 찍은 발자국', createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`, updatedAt: '' };
}

describe('free-placed footprints', () => {
  it('falls back to the default meander with no footprints', () => {
    const pathX = makePathX([], g);
    expect(pathX(20000)).toBe(trailX(20000, g));
  });

  it('runs exactly through each stamped footprint', () => {
    const list = [fp('2026-09-03', 0.12), fp('2026-09-20', 0.88), fp('2026-08-11', 0.5)];
    const anchors = buildAnchors(list, g);
    const pathX = makePathX(anchors, g);
    const times = footprintTimes(list);
    expect(pathX(times.get(list[0].id)!)).toBeCloseTo(placedX(0.12, g), 5);
    expect(pathX(times.get(list[1].id)!)).toBeCloseTo(placedX(0.88, g), 5);
  });

  it('puts the footprint where it was stamped and the label on the roomier side', () => {
    const right = fp('2026-09-16', 0.85);
    const left = fp('2026-09-05', 0.15);
    const list = [right, left];
    const pathX = makePathX(buildAnchors(list, g), g);
    const layout = layoutMonth({ year: 2026, month: 9, footprints: list, today, geometry: g, pathX });
    const r = layout.entries.find((e) => e.footprint.id === right.id)!;
    const l = layout.entries.find((e) => e.footprint.id === left.id)!;
    expect(r.x).toBeCloseTo(placedX(0.85, g), 5);
    expect(r.label.align).toBe('right');
    expect(r.label.left + r.label.width).toBeLessThanOrEqual(r.x);
    expect(l.label.align).toBe('left');
    expect(l.label.left).toBeGreaterThanOrEqual(l.x);
  });

  it('keeps the faint path continuous between months', () => {
    const list = [fp('2026-09-02', 0.9), fp('2026-08-28', 0.1)];
    const pathX = makePathX(buildAnchors(list, g), g);
    const sep = layoutMonth({ year: 2026, month: 9, footprints: list, today, geometry: g, pathX });
    const aug = layoutMonth({ year: 2026, month: 8, footprints: list, today, geometry: g, pathX });
    expect(Math.abs(pathX(yToU(sep.knots, sep.height)) - aug.topX)).toBeLessThan(0.5);
    expect(sep.bottomX).toBeCloseTo(pathX(dayIndex({ y: 2026, m: 9, d: 1 })), 5);
  });

  it('keeps labels from crossing even when they point toward each other', () => {
    const a = { ...fp('2026-09-16', 0.78), title: '오른쪽에 찍은 발자국인데 제목이 꽤 길어서 줄이 넘어감' };
    const b = { ...fp('2026-09-15', 0.08), title: '왼쪽 끝에 찍은 발자국도 제목이 길어서 여러 줄로 넘어감' };
    const list = [a, b];
    const pathX = makePathX(buildAnchors(list, g), g);
    const layout = layoutMonth({ year: 2026, month: 9, footprints: list, today, geometry: g, pathX });
    const [la, lb] = layout.entries.map((e) => e.label);
    const apart = lb.top >= la.top + la.height || la.top >= lb.top + lb.height;
    expect(apart).toBe(true);
  });
});
