import { SEASONS, mixHex, seasonOf } from '@/domain/seasons';

const prevMonth = (m: number) => ((m + 10) % 12) + 1;
const nextMonth = (m: number) => (m % 12) + 1;

export const groundOf = (month: number) => SEASONS[seasonOf(month)].ground;

export const monthOfKey = (key: number) => (key % 12) + 1;

/** Ground colors of a month and the blended edges it shares with its neighbours. */
export function monthGround(month: number) {
  const here = groundOf(month);
  return { top: mixHex(here, groundOf(nextMonth(month))), here, bottom: mixHex(here, groundOf(prevMonth(month))) };
}

/** Ground for a folded run of months: newest month at the top, oldest at the bottom. */
export function stretchGround(newestMonth: number, oldestMonth: number) {
  return {
    top: monthGround(newestMonth).top,
    upper: groundOf(newestMonth),
    lower: groundOf(oldestMonth),
    bottom: monthGround(oldestMonth).bottom,
  };
}
