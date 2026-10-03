"use client";
import { speak } from "./audio";
import { emit } from "./events";

/**
 * Luna speaks: the caption bubble shows immediately and the voice plays
 * Hebrew first, then English (Island 1–3 are Hebrew-first).
 */
export async function lunaSay(he?: string, en?: string, opts: { englishFirst?: boolean } = {}) {
  emit("luna.say", { he, en });
  const lines: [string | undefined, "he" | "en"][] = opts.englishFirst
    ? [[en, "en"], [he, "he"]]
    : [[he, "he"], [en, "en"]];
  for (const [text, lang] of lines) if (text) await speak(text, lang);
}
