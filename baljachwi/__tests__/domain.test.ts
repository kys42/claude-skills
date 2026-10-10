import { withJosa } from '@/domain/korean';
import { addDays, dayIndex, daysInMonth, formatKoreanDate, fromDayIndex, fromMonthKey, isValidISODate, monthKey } from '@/domain/dates';
import { countSteps, levelForSteps } from '@/domain/level';
import { isSeasonTop, seasonOf, seasonProgress } from '@/domain/seasons';

describe('dates', () => {
  it('handles month lengths and leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(31);
  });

  it('round-trips day indexes across year boundaries', () => {
    const ymd = { y: 2025, m: 12, d: 31 };
    expect(fromDayIndex(dayIndex(ymd) + 1)).toEqual({ y: 2026, m: 1, d: 1 });
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('keeps month keys consecutive', () => {
    expect(monthKey(2026, 1) - monthKey(2025, 12)).toBe(1);
    expect(fromMonthKey(monthKey(2026, 10))).toEqual({ y: 2026, m: 10 });
  });

  it('validates ISO dates', () => {
    expect(isValidISODate('2026-10-10')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-1-1')).toBe(false);
  });

  it('formats Korean dates with weekday', () => {
    expect(formatKoreanDate('2026-10-10')).toBe('2026년 10월 10일 (토)');
  });
});

describe('level', () => {
  it('counts big as 5 and small as 1', () => {
    expect(countSteps([{ size: 'big' }, { size: 'small' }, { size: 'small' }])).toBe(7);
  });

  it('matches the design sample: 25 steps is Lv.5 개척자 with 5 to go', () => {
    const info = levelForSteps(25);
    expect(info.level).toBe(5);
    expect(info.name).toBe('개척자');
    expect((info.next ?? 0) - info.steps).toBe(5);
  });

  it('starts at Lv.1 and caps at the top', () => {
    expect(levelForSteps(0).level).toBe(1);
    const top = levelForSteps(10_000);
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
  });
});

describe('seasons', () => {
  it('maps months to Korean seasons', () => {
    expect([3, 6, 9, 12, 1].map(seasonOf)).toEqual(['spring', 'summer', 'autumn', 'winter', 'winter']);
    expect(isSeasonTop(11)).toBe(true);
    expect(isSeasonTop(10)).toBe(false);
  });

  it('measures progress through a season', () => {
    expect(seasonProgress(9, 1, 30)).toBe(0);
    expect(seasonProgress(1, 1, 31)).toBeCloseTo(1 / 3);
  });
});

describe('korean', () => {
  it('chooses 이/가 by the final consonant', () => {
    expect(withJosa('탐험가', '이', '가')).toBe('탐험가가');
    expect(withJosa('전설', '이', '가')).toBe('전설이');
  });
});
