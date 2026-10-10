/**
 * Calendar helpers. Everything works on local calendar dates (`YYYY-MM-DD`)
 * so a footprint never drifts a day because of time zones.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export interface YMD {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): YMD {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const { y, m, d } = parseISODate(iso);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function formatISO({ y, m, d }: YMD): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Months counted from year 0 — consecutive months differ by exactly 1. */
export function monthKey(y: number, m: number): number {
  return y * 12 + (m - 1);
}

export function fromMonthKey(key: number): { y: number; m: number } {
  return { y: Math.floor(key / 12), m: (key % 12) + 1 };
}

/** Whole days since 1970-01-01 for a calendar date. */
export function dayIndex({ y, m, d }: YMD): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayIndex(index: number): YMD {
  const date = new Date(index * DAY_MS);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export function addDays(iso: string, days: number): string {
  return formatISO(fromDayIndex(dayIndex(parseISODate(iso)) + days));
}

export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function weekday(iso: string): string {
  return WEEKDAYS[new Date(Date.UTC(...toUTCArgs(iso))).getUTCDay()];
}

function toUTCArgs(iso: string): [number, number, number] {
  const { y, m, d } = parseISODate(iso);
  return [y, m - 1, d];
}

export function formatKoreanDate(iso: string): string {
  const { y, m, d } = parseISODate(iso);
  return `${y}년 ${m}월 ${d}일 (${weekday(iso)})`;
}

export function formatShort(iso: string): string {
  const { m, d } = parseISODate(iso);
  return `${pad(m)}.${pad(d)}`;
}
