"use client";
import { speak } from "./audio";
import { emit } from "./events";
import type { Line } from "./lines";

/**
 * Luna speaks a line from the catalog (src/lib/lines.ts): the caption shows
 * immediately and the voice plays Hebrew first, then English (Islands 1–3
 * are Hebrew-first).
 */
export async function lunaSay(line: Line, opts: { englishFirst?: boolean } = {}) {
  emit("luna.say", { he: line.he, en: line.en });
  const he = line.heSpeak ?? line.he;
  const en = line.enSpeak ?? line.en;
  const parts: [string | undefined, "he" | "en"][] = opts.englishFirst
    ? [[en, "en"], [he, "he"]]
    : [[he, "he"], [en, "en"]];
  for (const [text, lang] of parts) if (text) await speak(text, lang);
}
