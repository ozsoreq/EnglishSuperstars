/**
 * Builds a mission: three activities for one stop on the adventure path.
 *
 *   1. Warm-up  — a quick game with words due for review
 *   2. New words — the story moment that restores the place
 *   3. Practice — a game with the new words
 *
 * A child who hasn't met any words yet skips the warm-up and gets two
 * practice games. Revisiting a restored place swaps the story for practice.
 */
import type { ActivityType, Chapter, GameType } from "./content/types";
import { WORDS } from "./content/words";
import { dueWords, strength, type WordMemory } from "./srs";

export interface Activity {
  type: ActivityType;
  role: "warmup" | "new" | "practice";
  words: string[];
}

/** Games that work for a given set of words. */
function gameFits(game: GameType, words: string[], chapter: Chapter): boolean {
  switch (game) {
    case "train":
      return Boolean(chapter.letters?.length);
    case "detective":
      return Boolean(chapter.letters?.some((l) => l === "b" || l === "d"));
    case "memory":
      return words.length >= 3;
    default:
      return words.length >= 1;
  }
}

const WARMUP_GAMES: GameType[] = ["bubble", "memory", "say"];

export function buildMission(
  chapter: Chapter,
  memory: Record<string, WordMemory>,
  today: string,
  visits: number,
): Activity[] {
  const newWords = chapter.words;
  const revisit = visits > 0;

  // Warm-up words: due words from elsewhere, else the weakest words met so far.
  const elsewhere = (ids: string[]) => ids.filter((id) => !newWords.includes(id) && WORDS[id]);
  let warm = elsewhere(dueWords(memory, today)).slice(0, 4);
  if (warm.length < 3) {
    const weakest = elsewhere(Object.keys(memory))
      .filter((id) => !warm.includes(id))
      .sort((a, b) => strength(memory[a]) - strength(memory[b]));
    warm = [...warm, ...weakest].slice(0, 4);
  }
  if (revisit && warm.length < 3) warm = newWords.slice(0, 4);

  const practiceGames = chapter.games.filter((g) => gameFits(g, newWords, chapter));
  const pick = (offset: number) => practiceGames[(visits + offset) % practiceGames.length];

  const story: Activity = { type: "story", role: "new", words: newWords };
  const practice = (offset: number): Activity => ({ type: pick(offset), role: "practice", words: newWords });

  if (warm.length === 0) {
    return [story, practice(0), practice(1)];
  }

  const warmGame = WARMUP_GAMES.filter((g) => gameFits(g, warm, chapter))[visits % 2] ?? "bubble";
  const warmup: Activity = { type: warmGame, role: "warmup", words: warm };

  if (revisit) return [warmup, practice(0), practice(1)];
  return [warmup, story, practice(0)];
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
