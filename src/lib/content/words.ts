import type { Word } from "./types";

const list: Word[] = [
  // Greetings
  { id: "hello", en: "hello", he: "שלום", pic: "👋", theme: "greetings" },
  { id: "goodbye", en: "goodbye", he: "להתראות", pic: "🚶", theme: "greetings" },
  { id: "yes", en: "yes", he: "כן", pic: "👍", theme: "greetings" },
  { id: "no", en: "no", he: "לא", pic: "🙅", theme: "greetings" },
  { id: "thank-you", en: "thank you", he: "תודה", pic: "💐", theme: "greetings" },
  { id: "ok", en: "OK", he: "בסדר", pic: "👌", theme: "greetings" },

  // Colours
  { id: "red", en: "red", he: "אדום", pic: "color:#E53935", theme: "colors" },
  { id: "blue", en: "blue", he: "כחול", pic: "color:#1E88E5", theme: "colors" },
  { id: "yellow", en: "yellow", he: "צהוב", pic: "color:#FDD835", theme: "colors" },
  { id: "green", en: "green", he: "ירוק", pic: "color:#43A047", theme: "colors" },
  { id: "pink", en: "pink", he: "ורוד", pic: "color:#F48FB1", theme: "colors" },
  { id: "purple", en: "purple", he: "סגול", pic: "color:#8E24AA", theme: "colors" },
  { id: "orange", en: "orange", he: "כתום", pic: "color:#FB8C00", theme: "colors" },
  { id: "brown", en: "brown", he: "חום", pic: "color:#795548", theme: "colors" },
  { id: "black", en: "black", he: "שחור", pic: "color:#212121", theme: "colors" },
  { id: "white", en: "white", he: "לבן", pic: "color:#FFFFFF", theme: "colors" },

  // Numbers
  { id: "one", en: "one", he: "אחת", pic: "num:1", theme: "numbers" },
  { id: "two", en: "two", he: "שתיים", pic: "num:2", theme: "numbers" },
  { id: "three", en: "three", he: "שלוש", pic: "num:3", theme: "numbers" },
  { id: "four", en: "four", he: "ארבע", pic: "num:4", theme: "numbers" },
  { id: "five", en: "five", he: "חמש", pic: "num:5", theme: "numbers" },
  { id: "six", en: "six", he: "שש", pic: "num:6", theme: "numbers" },
  { id: "seven", en: "seven", he: "שבע", pic: "num:7", theme: "numbers" },
  { id: "eight", en: "eight", he: "שמונה", pic: "num:8", theme: "numbers" },
  { id: "nine", en: "nine", he: "תשע", pic: "num:9", theme: "numbers" },
  { id: "ten", en: "ten", he: "עשר", pic: "num:10", theme: "numbers" },

  // Letter sounds a–m (anchor words)
  { id: "apple", en: "apple", he: "תפוח", pic: "🍎", theme: "letters", letter: "a" },
  { id: "ball", en: "ball", he: "כדור", pic: "⚽", theme: "letters", letter: "b" },
  { id: "cat", en: "cat", he: "חתול", pic: "🐱", theme: "letters", letter: "c" },
  { id: "dog", en: "dog", he: "כלב", pic: "🐶", theme: "letters", letter: "d" },
  { id: "egg", en: "egg", he: "ביצה", pic: "🥚", theme: "letters", letter: "e" },
  { id: "fish", en: "fish", he: "דג", pic: "🐟", theme: "letters", letter: "f" },
  { id: "goat", en: "goat", he: "עז", pic: "🐐", theme: "letters", letter: "g" },
  { id: "hat", en: "hat", he: "כובע", pic: "🎩", theme: "letters", letter: "h" },
  { id: "insect", en: "insect", he: "חרק", pic: "🐛", theme: "letters", letter: "i" },
  { id: "jellyfish", en: "jellyfish", he: "מדוזה", pic: "🪼", theme: "letters", letter: "j" },
  { id: "kite", en: "kite", he: "עפיפון", pic: "🪁", theme: "letters", letter: "k" },
  { id: "lemon", en: "lemon", he: "לימון", pic: "🍋", theme: "letters", letter: "l" },
  { id: "moon", en: "moon", he: "ירח", pic: "🌙", theme: "letters", letter: "m" },
];

export const WORDS: Record<string, Word> = Object.fromEntries(list.map((w) => [w.id, w]));
export const ALL_WORDS = list;

export function word(id: string): Word {
  const w = WORDS[id];
  if (!w) throw new Error(`Unknown word: ${id}`);
  return w;
}

/**
 * Speakable approximations of letter *sounds* (not names) for the TTS
 * fallback. Recorded voice-actor audio replaces these in production.
 */
export const LETTER_SOUNDS: Record<string, string> = {
  a: "ah",
  b: "buh",
  c: "kuh",
  d: "duh",
  e: "eh",
  f: "fff",
  g: "guh",
  h: "hah",
  i: "ih",
  j: "juh",
  k: "kuh",
  l: "lll",
  m: "mmm",
};
