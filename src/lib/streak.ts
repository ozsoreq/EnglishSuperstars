/**
 * Daily streak with a gentle reset: one free "snow day" per week keeps the
 * streak alive across a single missed day.
 */
import { daysBetween, weekKey } from "./dates";

export interface Streak {
  count: number;
  lastDay: string;
  /** Week key in which the snow day was used. */
  snowDayWeek: string;
}

export const EMPTY_STREAK: Streak = { count: 0, lastDay: "", snowDayWeek: "" };

export interface StreakUpdate {
  streak: Streak;
  /** True when this is the first completed mission today. */
  advanced: boolean;
  usedSnowDay: boolean;
}

export function completeDay(s: Streak, today: string): StreakUpdate {
  if (s.lastDay === today) return { streak: s, advanced: false, usedSnowDay: false };
  if (!s.lastDay) return { streak: { ...s, count: 1, lastDay: today }, advanced: true, usedSnowDay: false };

  const gap = daysBetween(s.lastDay, today);
  if (gap === 1) {
    return { streak: { ...s, count: s.count + 1, lastDay: today }, advanced: true, usedSnowDay: false };
  }
  const week = weekKey(today);
  if (gap === 2 && s.snowDayWeek !== week) {
    return {
      streak: { count: s.count + 1, lastDay: today, snowDayWeek: week },
      advanced: true,
      usedSnowDay: true,
    };
  }
  return { streak: { ...s, count: 1, lastDay: today }, advanced: true, usedSnowDay: false };
}

/** +1 per streak day, max +7. */
export function streakBonus(count: number): number {
  return Math.max(1, Math.min(7, count));
}
