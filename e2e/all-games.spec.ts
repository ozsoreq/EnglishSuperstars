/**
 * Every stage × every game it supports, played to completion through the
 * debug panel. Runs on the tablet project only (the matrix is long).
 */
import { expect, test } from "@playwright/test";
import { ISLANDS } from "../src/lib/content/islands";
import type { GameType } from "../src/lib/content/types";
import { gameFits } from "../src/lib/mission";
import { activeProfile, family, openDebugPanel, playUntilRestored, profile, setup, startQuest } from "./helpers";

const LABEL: Record<string, string> = {
  story: "Story",
  bubble: "Bubble Pop",
  say: "Say It",
  memory: "Memory",
  train: "Sound Train",
  detective: "b/d Detective",
  paint: "Paint",
  count: "Feed the Dolphin",
  trace: "Letter Trace",
  greet: "What Do We Say?",
};

for (const chapter of ISLANDS[0].chapters) {
  const games = ["story", "bubble", "say", "memory", "train", "detective", "paint", "count", "trace", "greet"].filter(
    (g) => g === "story" || gameFits(g as GameType, chapter.words, chapter),
  );
  for (const game of games) {
    test(`${chapter.name.en} · ${LABEL[game]}`, async ({ page }, info) => {
      test.skip(info.project.name !== "tablet", "matrix runs on tablet");
      const errors = await setup(page, { state: family([profile()]), debug: true });
      await page.goto("/");
      await openDebugPanel(page);
      await page
        .locator("aside div.border-t", { hasText: chapter.name.en })
        .getByRole("button", { name: LABEL[game], exact: true })
        .click();
      await startQuest(page);
      await playUntilRestored(page);
      const p = await activeProfile(page);
      expect(p.ledger.filter((e) => e.reason === "activity")).toHaveLength(1);
      expect(p.ledger.find((e) => e.reason === "activity")?.amount).toBe(3);
      expect(errors).toEqual([]);
    });
  }
}
