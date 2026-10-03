"use client";
import { motion } from "motion/react";
import { useRef } from "react";
import { sayWord, sfx } from "@/lib/audio";
import type { Chapter } from "@/lib/content/types";
import { ALL_WORDS, WORDS } from "@/lib/content/words";
import { emit } from "@/lib/events";
import { lunaSay } from "@/lib/luna";
import type { Activity, ActivityResult } from "@/lib/mission";
import type { Quality } from "@/lib/srs";

export interface GameProps {
  activity: Activity;
  chapter: Chapter;
  onDone: (r: ActivityResult) => void;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Distractors from the same theme where possible, so choices are fair. */
export function distractors(targetId: string, pool: string[], n: number): string[] {
  const target = WORDS[targetId];
  const sameTheme = ALL_WORDS.filter((w) => w.theme === target.theme && w.id !== targetId).map((w) => w.id);
  const preferred = shuffle(pool.filter((id) => id !== targetId));
  const rest = shuffle(sameTheme.filter((id) => !preferred.includes(id)));
  return [...preferred, ...rest].slice(0, n);
}

export function centerOf(el: Element | null | undefined): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Tracks attempts per item and turns them into scheduler quality:
 * right first try = 5, right after a hint = 3, shown the answer = 1.
 */
export function useTracker() {
  const attempts = useRef(new Map<string, number>());
  const quality = useRef<Record<string, Quality>>({});
  const firstTry = useRef(0);
  const total = useRef(0);
  const spoken = useRef<string[]>([]);

  return {
    /** Register a wrong try; returns how many wrong tries this item has now. */
    miss(item: string): number {
      const n = (attempts.current.get(item) ?? 0) + 1;
      attempts.current.set(item, n);
      return n;
    },
    /** Item finished. `shown` = we had to show the answer. */
    finish(item: string, opts: { wordId?: string; shown?: boolean } = {}) {
      const misses = attempts.current.get(item) ?? 0;
      total.current += 1;
      if (misses === 0 && !opts.shown) firstTry.current += 1;
      const q: Quality = opts.shown ? 1 : misses === 0 ? 5 : 3;
      const wid = opts.wordId ?? (WORDS[item] ? item : undefined);
      if (wid) quality.current[wid] = Math.min(quality.current[wid] ?? 5, q) as Quality;
    },
    spoke(wordId: string) {
      if (!spoken.current.includes(wordId)) spoken.current.push(wordId);
    },
    result(): ActivityResult {
      return { firstTry: firstTry.current, total: total.current, quality: { ...quality.current }, spoken: [...spoken.current] };
    },
  };
}

export function cheer(el?: Element | null, wordId?: string) {
  sfx("pop");
  const c = centerOf(el);
  emit("answer.correct", { wordId, x: c?.x, y: c?.y });
}

/** Gentle wrong-answer feedback: a wobble sound and a Hebrew hint from Luna. */
export function nudge(wordId: string | undefined, attempt: number, hintHe?: string) {
  sfx("soft");
  emit("answer.wrong", { wordId, attempt });
  if (hintHe) void lunaSay(hintHe);
}

export async function hearWord(wordId: string) {
  await sayWord(WORDS[wordId]?.en ?? wordId);
}

/** Round pips, filled right-to-left in Hebrew mode. */
export function Pips({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex justify-center gap-2" aria-label={`${done} מתוך ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="block h-3 w-3 rounded-full border-2 border-night-deep"
          animate={{ backgroundColor: i < done ? "#FFC53D" : "#ffffff33", scale: i === done ? 1.3 : 1 }}
        />
      ))}
    </div>
  );
}

export function SpeakerButton({ onClick, label = "להקשיב שוב" }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.85 }}
      className="chunky grid h-16 w-16 place-items-center bg-lavender text-3xl"
      onClick={() => {
        sfx("tap");
        onClick();
      }}
    >
      🔊
    </motion.button>
  );
}

/** Small wait helper for pacing between rounds. */
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
