/**
 * Lists every clip the app can play — all catalogued lines, words, item
 * names, pet tricks and letter sounds — with the id the app will look up.
 * Output: scripts/voice/lines.json (input for generate.py).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PET_TRICKS, ALL_ITEMS } from "../../src/lib/catalog";
import { ISLANDS } from "../../src/lib/content/islands";
import { ALL_WORDS } from "../../src/lib/content/words";
import { allLines } from "../../src/lib/lines";
import { LETTER_IPA, voiceKey, type TtsRequest } from "../../src/lib/tts";

const clips = new Map<string, TtsRequest & { key: string; ipa?: string }>();
const add = (r: TtsRequest, ipa?: string) => {
  const key = voiceKey(r);
  if (!clips.has(key)) clips.set(key, { ...r, key, ipa });
};

for (const line of allLines()) {
  const he = line.heSpeak ?? line.he;
  const en = line.enSpeak ?? line.en;
  if (he) add({ text: he, lang: "he", kind: "line", voice: "guide" });
  if (en) add({ text: en, lang: "en", kind: "line", voice: "guide" });
}

const trainWords = ISLANDS.flatMap((i) => i.chapters.flatMap((c) => (c.trainWords ?? []).map((t) => t.word)));
const words = [...ALL_WORDS.map((w) => w.en), ...trainWords, ...ALL_ITEMS.map((i) => i.en), ...PET_TRICKS.map((t) => t.en)];
for (const w of words) add({ text: w, lang: "en", kind: "word", voice: "guide" });
for (const w of ALL_WORDS) add({ text: w.en, lang: "en", kind: "word", voice: "child" });
for (const [letter, ipa] of Object.entries(LETTER_IPA)) add({ text: letter, lang: "en", kind: "sound", voice: "guide" }, ipa);

const out = fileURLToPath(new URL("./lines.json", import.meta.url));
const list = [...clips.values()];
writeFileSync(out, JSON.stringify(list, null, 1) + "\n");
const by = (l: string) => list.filter((c) => c.lang === l).length;
console.log(`${list.length} clips (${by("en")} English, ${by("he")} Hebrew) → scripts/voice/lines.json`);
