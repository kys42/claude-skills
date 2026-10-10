import type { Footprint, Size } from './types';

export const STEPS: Record<Size, number> = { big: 5, small: 1 };

/** Steps needed to reach each level; index 0 is Lv.1. */
const THRESHOLDS = [0, 4, 9, 15, 22, 30, 40, 52, 66, 82, 100];
const NAMES = ['첫걸음', '산책자', '여행자', '모험가', '개척자', '탐험가', '순례자', '등반가', '항해자', '지도 제작자', '전설'];

export interface LevelInfo {
  level: number;
  name: string;
  steps: number;
  /** Steps at which the current level started. */
  floor: number;
  /** Steps needed for the next level, or null at the top. */
  next: number | null;
  nextName: string | null;
  /** 0–1 progress inside the current level. */
  progress: number;
}

export function countSteps(footprints: Pick<Footprint, 'size'>[]): number {
  return footprints.reduce((sum, f) => sum + STEPS[f.size], 0);
}

export function levelForSteps(steps: number): LevelInfo {
  let i = 0;
  while (i + 1 < THRESHOLDS.length && steps >= THRESHOLDS[i + 1]) i += 1;
  const floor = THRESHOLDS[i];
  const next = i + 1 < THRESHOLDS.length ? THRESHOLDS[i + 1] : null;
  return {
    level: i + 1,
    name: NAMES[i],
    steps,
    floor,
    next,
    nextName: next === null ? null : NAMES[i + 1],
    progress: next === null ? 1 : (steps - floor) / (next - floor),
  };
}
