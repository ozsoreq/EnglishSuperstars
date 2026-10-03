import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { CAMP, GEAR, PETS, AVATARS } from "./catalog";
import { ISLANDS } from "./content/islands";
import { ALL_WORDS } from "./content/words";
import { emojiKey, emojiSrc, splitEmoji } from "./emoji";

describe("emoji art", () => {
  it("has Fluent 3D art for every emoji used by content and the shop", () => {
    const used = [
      ...ALL_WORDS.filter((w) => !w.pic.includes(":")).map((w) => w.pic),
      ...ISLANDS.flatMap((i) => [i.friend.emoji, ...i.chapters.flatMap((c) => [c.landmark, c.treasure.emoji, ...(c.trainWords ?? []).map((t) => t.pic)])]),
      ...[...GEAR, ...CAMP, ...PETS].map((x) => x.emoji),
      ...AVATARS,
    ];
    const missing = used.filter((e) => {
      const src = emojiSrc(e);
      return !src || !existsSync(`public${src}`);
    });
    expect(missing).toEqual([]);
  });

  it("keys ignore the emoji presentation selector and keep skin tones", () => {
    expect(emojiKey("🗺️")).toBe("1f5fa");
    expect(emojiKey("👧🏽")).toBe("1f467-1f3fd");
  });

  it("splits text around emoji", () => {
    expect(splitEmoji("⛺ מחנה")).toEqual([
      { text: "⛺", emoji: true },
      { text: " מחנה", emoji: false },
    ]);
  });
});
