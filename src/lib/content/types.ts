export type Theme = "greetings" | "colors" | "numbers" | "letters";

/**
 * A picture is described as a string so content packs stay plain data:
 *  - "color:#E53935" → a paint blob
 *  - "num:3"         → three counting stars
 *  - anything else   → an emoji
 */
export interface Word {
  id: string;
  en: string;
  he: string;
  pic: string;
  theme: Theme;
  /** For letter-sound anchor words ("ball" → "b"). */
  letter?: string;
}

export type GameType = "bubble" | "say" | "train" | "memory" | "detective" | "paint" | "count" | "trace" | "greet";
export type ActivityType = GameType | "story";

export interface Bilingual {
  he: string;
  en: string;
}

export interface TrainWord {
  word: string;
  pic: string;
  he: string;
}

/** One stop on the island's adventure path: a place to restore with English. */
export interface Chapter {
  id: string;
  name: Bilingual;
  /** Emoji shown on the map and in the story scene. */
  landmark: string;
  /** Short Hebrew line naming the challenge the child is on. */
  quest: string;
  /** The problem Luna discovers when they arrive. */
  problem: Bilingual;
  /** What Luna says as each new word restores part of the place. */
  restoreLine: string;
  /** What happens once the place is restored. */
  resolved: Bilingual;
  treasure: { emoji: string; he: string; en: string };
  /** New words introduced here (Word ids). */
  words: string[];
  /** Letter sounds in focus, for phonics games. */
  letters?: string[];
  trainWords?: TrainWord[];
  /** Practice games, rotated across visits. */
  games: GameType[];
  /** Hebrew flavour text per game, so each game feels like a quest step. */
  gameIntro: Partial<Record<GameType, string>>;
}

export interface Island {
  id: string;
  index: number;
  name: Bilingual;
  focus: string;
  canDo: string;
  friend: { emoji: string; name: Bilingual };
  playable: boolean;
  chapters: Chapter[];
  /** Colours for the island on the sea chart. */
  tint: string;
}
