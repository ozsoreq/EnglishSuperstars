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
