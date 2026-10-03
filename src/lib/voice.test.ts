import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { ALL_WORDS } from "./content/words";
import { L, allLines } from "./lines";
import { LETTER_IPA, voiceKey } from "./tts";
import { VOICE_PACK } from "./voice-pack";

const has = (text: string, kind: "line" | "word" | "sound", voice: "guide" | "child" = "guide") =>
  VOICE_PACK.has(voiceKey({ text, lang: "en", kind, voice }));

describe("voice pack", () => {
  it("hashes exactly like scripts/voice/generate.py", () => {
    expect(voiceKey({ text: "apple", lang: "en", kind: "word", voice: "guide" })).toBe("2715960b9ddb4dca");
    expect(voiceKey({ text: "שלום! אני לונה.", lang: "he", kind: "line", voice: "guide" })).toBe("1b5aa07f15a3d589");
  });

  it("has a natural recording for every English line, word and letter sound", () => {
    const missing = [
      ...allLines()
        .map((l) => l.enSpeak ?? l.en)
        .filter((t): t is string => Boolean(t) && !has(t!, "line")),
      ...ALL_WORDS.filter((w) => !has(w.en, "word") || !has(w.en, "word", "child")).map((w) => w.en),
      ...Object.keys(LETTER_IPA).filter((l) => !has(l, "sound")),
    ];
    expect(missing).toEqual([]);
  });

  it("ships a file for every id it lists", () => {
    const listed = JSON.parse(readFileSync("public/voice/manifest.json", "utf8")) as string[];
    expect(listed.length).toBe(VOICE_PACK.size);
    for (const key of VOICE_PACK) expect(existsSync(`public/voice/${key}.mp3`)).toBe(true);
  });

  it("never speaks a child's name it can't pre-record", () => {
    const greet = L.greetQuest("Noa", { quest: "q", name: { he: "x", en: "x" } } as never);
    expect(greet.he).toContain("Noa");
    expect(greet.heSpeak).not.toContain("Noa");
    expect(greet.enSpeak).not.toContain("Noa");
  });
});

describe("speech call sites", () => {
  it("only speak through the lines catalog", () => {
    // Literal strings passed straight to lunaSay would have no recording.
    const files = ["Quest", "Camp", "IslandMap", "WorldMap", "Welcome"].map((f) => `src/components/screens/${f}.tsx`);
    files.push(...["BubblePop", "SayIt", "StoryMoment", "SoundTrain", "Detective"].map((f) => `src/components/games/${f}.tsx`));
    files.push("src/components/Goodnight.tsx");
    for (const f of files) expect(readFileSync(f, "utf8")).not.toMatch(/lunaSay\(\s*[`"']/);
  });
});
