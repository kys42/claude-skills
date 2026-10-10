export type Category = 'achieve' | 'project' | 'growth' | 'change';

export type Size = 'big' | 'small';

export interface Footprint {
  id: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  size: Size;
  category: Category;
  title: string;
  note?: string;
  /** Where across the ground it was stamped, 0–1 of the column; unset follows the default path. */
  x?: number;
  createdAt: string;
  updatedAt: string;
}

export type FootprintDraft = Pick<Footprint, 'date' | 'size' | 'category' | 'title' | 'note' | 'x'>;
