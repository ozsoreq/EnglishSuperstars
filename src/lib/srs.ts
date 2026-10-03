/**
 * Spaced repetition: an SM-2-style scheduler tuned for kids.
 *
 * - Only the first result of the day moves a word forward, so playing three
 *   games with the same word in one session doesn't fake mastery.
 * - A miss always brings the word back tomorrow ("early review").
 * - Intervals grow more gently than adult SM-2 and the ease never drops
 *   below 1.5, so a struggling child isn't buried in reviews.
 */
import { addDays } from "./dates";

/** 5 = right first try, 3 = right after a hint, 1 = shown the answer. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface WordMemory {
  ef: number;
  interval: number;
  reps: number;
  due: string;
  firstSeen: string;
  lastReviewed: string;
  lapses: number;
}

export type Mastery = "grey" | "silver" | "gold";

export const GOLD_REPS = 4;

export function introduce(today: string): WordMemory {
  return { ef: 2.3, interval: 0, reps: 0, due: today, firstSeen: today, lastReviewed: "", lapses: 0 };
}

export function review(mem: WordMemory | undefined, quality: Quality, today: string): WordMemory {
  const m = mem ?? introduce(today);

  if (m.lastReviewed === today) {
    // Already counted today; a later miss still pulls the word forward.
    if (quality < 3) return { ...m, due: addDays(today, 1) };
    return m;
  }

  if (quality < 3) {
    return {
      ...m,
      reps: 0,
      interval: 1,
      due: addDays(today, 1),
      lastReviewed: today,
      lapses: m.lapses + 1,
      ef: Math.max(1.5, m.ef - 0.2),
    };
  }

  const reps = m.reps + 1;
  const ef = Math.max(1.5, m.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const interval = reps === 1 ? 1 : reps === 2 ? 2 : Math.round(m.interval * Math.min(ef, 2.2));
  return { ...m, reps, ef, interval, due: addDays(today, interval), lastReviewed: today };
}

export function mastery(mem: WordMemory | undefined): Mastery | "unseen" {
  if (!mem) return "unseen";
  if (mem.reps >= GOLD_REPS) return "gold";
  if (mem.reps >= 2) return "silver";
  return "grey";
}

/** 0..1 memory strength, for the Word Book and picking weak words. */
export function strength(mem: WordMemory | undefined): number {
  if (!mem) return 0;
  return Math.min(1, mem.reps / GOLD_REPS);
}

/** Words due today or earlier, most overdue and weakest first. */
export function dueWords(memory: Record<string, WordMemory>, today: string): string[] {
  return Object.entries(memory)
    .filter(([, m]) => m.due <= today)
    .sort(([, a], [, b]) => (a.due === b.due ? strength(a) - strength(b) : a.due < b.due ? -1 : 1))
    .map(([id]) => id);
}
