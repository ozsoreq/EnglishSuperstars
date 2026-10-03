import { expect, test } from "@playwright/test";
import {
  activeProfile,
  earnedBy,
  family,
  openDebugPanel,
  playUntilRestored,
  profile,
  setup,
  startQuest,
  toStarMoment,
} from "./helpers";

test("a perfect first quest restores the place and pays the right stars", async ({ page }) => {
  const errors = await setup(page, { state: family([profile()]), debug: true });
  await page.goto("/");
  await page.locator('button[aria-label^="המאורה של לונה"]').click({ force: true });
  await expect(page.getByText(/אוי! כל החברים באי נרדמו/).first()).toBeVisible();
  await startQuest(page);
  await playUntilRestored(page);
  await expect(page.getByText("מצאתם אוצר!")).toBeVisible();
  await expect(page.getByText("צדף השלום")).toBeVisible();
  await toStarMoment(page);
  await expect(page.getByText("בונוס משימה יומית")).toBeVisible();

  const p = await activeProfile(page);
  expect(earnedBy(p.ledger, "activity")).toBe(9); // 3 activities × 3 stars
  expect(earnedBy(p.ledger, "mission")).toBe(5);
  expect(earnedBy(p.ledger, "streak")).toBe(1);
  expect(p.visits["luna-den"]).toBe(1);
  expect(p.location).toBe("rainbow-falls");
  for (const w of ["hello", "goodbye", "yes", "no", "thank-you", "ok"]) expect(p.memory[w]).toBeTruthy();

  await page.getByRole("button", { name: /להמשיך לחקור/ }).click();
  await expect(page.locator('button[aria-label="מפל הקשת"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("mistakes never earn zero, get a Hebrew hint, then show the answer", async ({ page }) => {
  const errors = await setup(page, { state: family([profile()]), debug: true });
  await page.goto("/");
  await openDebugPanel(page);
  await page.locator("aside div.border-t", { hasText: "Rainbow Falls" }).getByRole("button", { name: /Bubble Pop/ }).click();
  await startQuest(page);
  const hint = page.getByText(/נסו שוב/).first();
  const run = playUntilRestored(page, { mistakes: true });
  await expect(hint).toBeVisible({ timeout: 20_000 });
  await run;
  const p = await activeProfile(page);
  const activity = earnedBy(p.ledger, "activity");
  expect(activity).toBeGreaterThanOrEqual(1);
  expect(activity).toBeLessThan(3);
  // Missed words come back sooner than words answered right first time.
  const reps = Object.values(p.memory).map((m) => m.reps);
  expect(reps.every((r) => r === 0 || r === 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("without debug mode, fogged stages stay locked", async ({ page }) => {
  const errors = await setup(page, { state: family([profile()]), debug: false });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Debug panel" })).toHaveCount(0);
  await page.locator('button[aria-label^="מפל הקשת"]').click({ force: true });
  await expect(page.getByText(/הערפל סמיך מדי/).first()).toBeVisible();
  await expect(page.getByText("יוצאים להרפתקה!")).toHaveCount(0);
  expect(errors).toEqual([]);
});
