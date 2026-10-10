import type { Category } from './types';

export interface CategoryMeta {
  label: string;
  /** Pigment pressed into the ground inside the footprint. */
  tint: string;
  /** Readable text color on every season ground (≥ 4.5:1). */
  text: string;
  /** `r, g, b` for the soft glow around big footprints. */
  glow: string;
  /** Light chip background in the editor. */
  wash: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  achieve: { label: '업적', tint: '#D9A21B', text: '#7A5800', glow: '217, 162, 27', wash: '#FBF1D6' },
  project: { label: '프로젝트', tint: '#3D6FD8', text: '#2F5BC0', glow: '61, 111, 216', wash: '#E6EDFB' },
  growth: { label: '성장', tint: '#2E9E7A', text: '#1A6B50', glow: '46, 158, 122', wash: '#E1F2EB' },
  change: { label: '변화', tint: '#D2557F', text: '#B23A63', glow: '210, 85, 127', wash: '#FBE6EE' },
};

export const CATEGORY_ORDER: Category[] = ['achieve', 'project', 'growth', 'change'];
