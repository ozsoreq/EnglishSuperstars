import { EMOJI_ASSETS } from "./emoji-assets";

/** Pictographic emoji, optionally with VS16, skin tone and ZWJ joins (same rule as scripts/sync-emoji.mjs). */
export const EMOJI_RE = /\p{Extended_Pictographic}️?(?:\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}️?(?:\p{Emoji_Modifier})?)*/gu;

/** Lookup key: lowercase hex code points joined by "-", without VS16. */
export function emojiKey(e: string): string {
  return [...e]
    .filter((c) => c !== "️")
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-");
}

/** URL of the self-hosted Fluent 3D art, or null when there is none (render as text). */
export function emojiSrc(e: string): string | null {
  const key = emojiKey(e);
  return EMOJI_ASSETS.has(key) ? `/emoji/${key}.webp` : null;
}

/** Split text into plain-text and emoji parts. */
export function splitEmoji(text: string): { text: string; emoji: boolean }[] {
  const parts: { text: string; emoji: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(EMOJI_RE)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index), emoji: false });
    parts.push({ text: m[0], emoji: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), emoji: false });
  return parts;
}
