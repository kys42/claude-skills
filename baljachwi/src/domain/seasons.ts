export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type DecoKind = 'leaf' | 'maple' | 'petal' | 'flower' | 'grass' | 'flake';

export interface SeasonMeta {
  label: string;
  /** Ground color of the season. */
  ground: string;
  /** Color of ordinary footsteps pressed into this ground. */
  step: string;
  /** Darker rim of a footprint pressed into this ground. */
  shade: string;
  /** What covers a month that has no records. */
  quiet: string;
  /** Strong accent used for the season marker. */
  accent: string;
  decoKinds: DecoKind[];
  decoColors: string[];
}

export const SEASONS: Record<Season, SeasonMeta> = {
  spring: {
    label: '봄',
    ground: '#F9ECEE',
    step: '#E0C1C5',
    shade: '#CBA3AA',
    quiet: '꽃잎이 덮은 시간',
    accent: '#A0405E',
    decoKinds: ['petal', 'petal', 'petal', 'flower'],
    decoColors: ['#F0ACBF', '#F6C6D2', '#EB9DB4'],
  },
  summer: {
    label: '여름',
    ground: '#E3EED6',
    step: '#A5C391',
    shade: '#8DAF78',
    quiet: '초록이 덮은 시간',
    accent: '#3F6B2F',
    decoKinds: ['grass', 'grass', 'grass', 'flower'],
    decoColors: ['#86B672', '#6FA35E', '#9CC788'],
  },
  autumn: {
    label: '가을',
    ground: '#F6EADA',
    step: '#D3BB9B',
    shade: '#BFA07A',
    quiet: '낙엽이 덮은 시간',
    accent: '#8A4A1E',
    decoKinds: ['leaf', 'maple', 'leaf'],
    decoColors: ['#D9733A', '#C2492C', '#E3A33B', '#B86A2B'],
  },
  winter: {
    label: '겨울',
    ground: '#F2F5F8',
    step: '#C3CEDA',
    shade: '#B3C1CF',
    quiet: '눈이 덮은 시간',
    accent: '#3D5F8C',
    decoKinds: ['flake'],
    decoColors: ['#BCCADA', '#C8D4E1'],
  },
};

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function seasonOf(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Last month of each season — the first one you meet scrolling into the past. */
export function isSeasonTop(month: number): boolean {
  return month === 2 || month === 5 || month === 8 || month === 11;
}

/** How far (0–1) a date is through its season. */
export function seasonProgress(month: number, day: number, daysInThisMonth: number): number {
  const start = { spring: 3, summer: 6, autumn: 9, winter: 12 }[seasonOf(month)];
  const offset = (month - start + 12) % 12;
  return (offset + (day - 1) / daysInThisMonth) / 3;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(a: string, b: string, t = 0.5): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
