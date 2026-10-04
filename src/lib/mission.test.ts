import { describe, expect, it } from "vitest";
import { buildMission, starsFor } from "./mission";
import { ISLANDS } from "./content/islands";
import { review } from "./srs";

const [den, falls, beach] = ISLANDS[0].chapters;
const today = "2026-10-03";

describe("buildMission", () => {
  it("always builds three activities", () => {
    for (const ch of ISLANDS[0].chapters) {
      expect(buildMission(ch, {}, today, 0)).toHaveLength(3);
      expect(buildMission(ch, {}, today, 3)).toHaveLength(3);
    }
  });

  it("starts with the story for a brand-new explorer", () => {
    const m = buildMission(den, {}, today, 0);
    expect(m[0]).toMatchObject({ type: "story", role: "new" });
  });

  it("warms up with due review words, then story, then practice", () => {
    const memory = Object.fromEntries(den.words.map((w) => [w, review(undefined, 5, "2026-10-01")]));
    const m = buildMission(falls, memory, today, 0);
    expect(m.map((a) => a.role)).toEqual(["warmup", "new", "practice"]);
    expect(m[0].words.every((w) => den.words.includes(w))).toBe(true);
  });

  it("drops the story on a revisit and only uses games that fit", () => {
    const m = buildMission(beach, {}, today, 2);
    expect(m.some((a) => a.type === "story")).toBe(false);
    expect(buildMission(falls, {}, today, 0).some((a) => a.type === "train")).toBe(false);
  });
});

describe("starsFor", () => {
  it("never gives zero", () => {
    expect(starsFor({ firstTry: 0, total: 5, quality: {}, spoken: [] })).toBe(1);
    expect(starsFor({ firstTry: 3, total: 5, quality: {}, spoken: [] })).toBe(2);
    expect(starsFor({ firstTry: 5, total: 5, quality: {}, spoken: [] })).toBe(3);
  });
});

describe("warm-ups and variety", () => {
  const reviewedOn = (ids: string[], day: string) => Object.fromEntries(ids.map((w) => [w, review(undefined, 5, day)]));

  it("skips the warm-up when earlier words aren't due yet (played today)", () => {
    const memory = reviewedOn(den.words, today); // due tomorrow
    const m = buildMission(falls, memory, today, 0);
    expect(m.some((a) => a.role === "warmup")).toBe(false);
    expect(m[0]).toMatchObject({ type: "story" });
  });

  it("warms up at most once a day", () => {
    const memory = reviewedOn(den.words, "2026-10-01");
    expect(buildMission(falls, memory, today, 0)[0].role).toBe("warmup");
    expect(buildMission(falls, memory, today, 0, { warmedUpToday: true }).some((a) => a.role === "warmup")).toBe(false);
  });

  it("needs at least 3 due words for a warm-up", () => {
    const memory = reviewedOn(den.words.slice(0, 2), "2026-10-01");
    expect(buildMission(falls, memory, today, 0).some((a) => a.role === "warmup")).toBe(false);
  });

  it("never repeats a game in one mission, and rotates on revisits", () => {
    for (const ch of ISLANDS[0].chapters) {
      for (let v = 0; v < 4; v++) {
        const types = buildMission(ch, {}, today, v).map((a) => a.type);
        expect(new Set(types).size).toBe(types.length);
      }
      const firstGames = [0, 1, 2].map((v) => buildMission(ch, {}, today, v + 1)[0].type);
      expect(new Set(firstGames).size).toBeGreaterThan(1);
    }
  });

  it("leads each stage's first practice with its own signature game", () => {
    const sig = Object.fromEntries(ISLANDS[0].chapters.map((c) => [c.id, buildMission(c, {}, today, 0)[1].type]));
    expect(sig).toMatchObject({ "luna-den": "greet", "rainbow-falls": "paint", "counting-rocks": "count", "echo-cave": "trace", "lighthouse": "trace" });
  });
});
