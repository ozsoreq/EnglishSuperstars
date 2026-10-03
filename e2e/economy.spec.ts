import { expect, test } from "@playwright/test";
import {
  activeProfile,
  earnedBy,
  enterStage,
  family,
  profile,
  setup,
  skipQuest,
  stars,
  today,
  toStarMoment,
} from "./helpers";

const CAPPED = ["activity", "mission", "speak", "streak", "mastered", "weekly"];
const cappedToday = (ledger: { reason: string; amount: number; kind: string; day?: string }[]) =>
  ledger.filter((e) => e.kind === "earn" && CAPPED.includes(e.reason) && e.day === today()).reduce((s, e) => s + e.amount, 0);

test("learning stars stop at the daily cap of 60", async ({ page }) => {
  const errors = await setup(page, { state: family([profile({ ledger: [stars(58, "activity")] })]), debug: true });
  await page.goto("/");
  await enterStage(page, "המאורה של לונה");
  await skipQuest(page);
  await toStarMoment(page);
  const p = await activeProfile(page);
  expect(cappedToday(p.ledger as never)).toBe(60);
  expect(errors).toEqual([]);
});

test("streak: continues from yesterday with a +N bonus", async ({ page }) => {
  await setup(page, { state: family([profile({ streak: { count: 3, lastDay: today(-1), snowDayWeek: "" } })]), debug: true });
  await page.goto("/");
  await enterStage(page, "המאורה של לונה");
  await skipQuest(page);
  await toStarMoment(page);
  const p = await activeProfile(page);
  expect(p.streak.count).toBe(4);
  expect(earnedBy(p.ledger, "streak")).toBe(4);
});

test("streak: one missed day is saved by the weekly snow day", async ({ page }) => {
  await setup(page, { state: family([profile({ streak: { count: 5, lastDay: today(-2), snowDayWeek: "" } })]), debug: true });
  await page.goto("/");
  await enterStage(page, "המאורה של לונה");
  await skipQuest(page);
  await toStarMoment(page);
  await expect(page.getByText(/יום שלג/)).toBeVisible();
  expect((await activeProfile(page)).streak.count).toBe(6);
});

test("streak: resets gently after a longer gap", async ({ page }) => {
  await setup(page, { state: family([profile({ streak: { count: 9, lastDay: today(-4), snowDayWeek: "" } })]), debug: true });
  await page.goto("/");
  await enterStage(page, "המאורה של לונה");
  await skipQuest(page);
  await toStarMoment(page);
  expect((await activeProfile(page)).streak.count).toBe(1);
});

test("the daily mission bonus is paid once per day", async ({ page }) => {
  await setup(page, { state: family([profile()]), debug: true });
  await page.goto("/");
  for (const stage of ["המאורה של לונה", "מפל הקשת"]) {
    await enterStage(page, stage);
    await skipQuest(page);
    await toStarMoment(page);
    await page.getByRole("button", { name: /להמשיך לחקור/ }).click();
  }
  const p = await activeProfile(page);
  expect(p.ledger.filter((e) => e.reason === "mission")).toHaveLength(1);
  expect(p.visits["luna-den"]).toBe(1);
  expect(p.visits["rainbow-falls"]).toBe(1);
});

test("finishing the island pays +50, a trophy and marks it done", async ({ page }) => {
  const ids = ["luna-den", "rainbow-falls", "shell-beach", "counting-rocks", "paint-cove", "echo-cave", "starfish-bridge"];
  const visits = Object.fromEntries(ids.map((id) => [id, 1]));
  await setup(page, { state: family([profile({ visits, location: "lighthouse" })]), debug: true });
  await page.goto("/");
  await enterStage(page, "המגדלור");
  await skipQuest(page);
  await expect(page.getByText("גביע חוף הצלילים").first()).toBeVisible();
  await toStarMoment(page);
  await expect(page.getByText("סיימתם את האי")).toBeVisible();
  const p = await activeProfile(page);
  expect(earnedBy(p.ledger, "island")).toBe(50);
  expect(p.islandsDone).toContain("sound-shore");
});
