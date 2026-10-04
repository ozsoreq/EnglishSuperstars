/**
 * Builds a mission: three activities for one stop on the adventure path.
 *
 *   • Warm-up  — only when at least 3 words from earlier stages are truly due
 *                for review (spaced repetition), and at most once a day.
 *   • New words — the story moment that restores the place (first visit).
 *   • Practice — this stage's own games, never the same game twice in one
 *                mission, rotating across visits.
 */
import type { ActivityType, Chapter, GameType } from "./content/types";
import { WORDS } from "./content/words";
import { dueWords, type WordMemory } from "./srs";

export interface Activity {
  type: ActivityType;
  role: "warmup" | "new" | "practice";
  words: string[];
}

const ofTheme = (words: string[], theme: string) => words.filter((id) => WORDS[id]?.theme === theme);

/** Games that work for a given set of words. */
export function gameFits(game: GameType, words: string[], chapter: Chapter): boolean {
  switch (game) {
    case "train":
      return Boolean(chapter.letters?.length);
    case "detective":
      return Boolean(chapter.letters?.some((l) => l === "b" || l === "d"));
    case "trace":
      return Boolean(chapter.letters?.length);
    case "paint":
      return ofTheme(words, "colors").length >= 2;
    case "count":
      return ofTheme(words, "numbers").length >= 2;
    case "greet":
      return ofTheme(words, "greetings").length >= 3;
    case "memory":
      return words.length >= 3;
    default:
      return words.length >= 1;
  }
}

/** Fewer due words than this and the mission skips the warm-up. */
export const MIN_WARMUP_WORDS = 3;

const WARMUP_GAMES: GameType[] = ["bubble", "memory", "say"];

export interface MissionOptions {
  /** A warm-up was already played today. */
  warmedUpToday?: boolean;
}

export function buildMission(
  chapter: Chapter,
  memory: Record<string, WordMemory>,
  today: string,
  visits: number,
  opts: MissionOptions = {},
): Activity[] {
  const newWords = chapter.words;
  const revisit = visits > 0;

  // This stage's games, rotated so each visit leads with a different one.
  const fitting = chapter.games.filter((g) => gameFits(g, newWords, chapter));
  const rotated = fitting.map((_, i) => fitting[(i + visits) % fitting.length]);

  const due = dueWords(memory, today).filter((id) => !newWords.includes(id) && WORDS[id]);
  const warmup = !opts.warmedUpToday && due.length >= MIN_WARMUP_WORDS;

  const acts: Activity[] = [];
  if (!revisit) acts.push({ type: "story", role: "new", words: newWords });

  const practiceSlots = 3 - acts.length - (warmup ? 1 : 0);
  for (let i = 0; i < practiceSlots; i++) {
    const unused = rotated.find((g) => !acts.some((a) => a.type === g));
    acts.push({ type: unused ?? rotated[i % rotated.length], role: "practice", words: newWords });
  }

  if (warmup) {
    const words = due.slice(0, 4);
    const options = WARMUP_GAMES.filter((g) => gameFits(g, words, chapter) && !acts.some((a) => a.type === g));
    const type = options[visits % Math.max(1, options.length)] ?? "bubble";
    acts.unshift({ type, role: "warmup", words });
  }
  return acts;
}

export interface ActivityResult {
  /** Items answered right on the first try. */
  firstTry: number;
  total: number;
  /** Per-word quality for the scheduler. */
  quality: Record<string, 0 | 1 | 2 | 3 | 4 | 5>;
  /** Words recognised by speech this activity. */
  spoken: string[];
}

/** 1 for finishing, 2 for most correct, 3 for all correct (or near). */
export function starsFor(result: ActivityResult): 1 | 2 | 3 {
  if (result.total === 0) return 1;
  const ratio = result.firstTry / result.total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
}
