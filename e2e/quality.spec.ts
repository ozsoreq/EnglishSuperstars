/**
 * Cross-cutting quality: accessibility (axe), layout at small widths, touch
 * target sizes, RTL/LTR separation, reduced motion and offline play.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { enterParent, enterStage, family, openCamp, profile, setup, stars, startQuest } from "./helpers";

type Screen = { name: string; open: (page: Page) => Promise<void> };

const SCREENS: Screen[] = [
  { name: "map", open: async () => {} },
  { name: "quest-arrive", open: async (p) => enterStage(p, "המאורה של לונה") },
  {
    name: "quest-game",
    open: async (p) => {
      await enterStage(p, "המאורה של לונה");
      await startQuest(p);
      await p.waitForTimeout(1500);
    },
  },
  { name: "camp", open: openCamp },
  {
    name: "journal",
    open: async (p) => {
      await p.getByRole("button", { name: "יומן", exact: true }).click();
      await expect(p.getByRole("heading", { name: /יומן המגלים/ })).toBeVisible();
    },
  },
  {
    name: "sea-chart",
    open: async (p) => {
      await p.getByRole("button", { name: "ים", exact: true }).click();
      await expect(p.getByRole("heading", { name: "מפת הים" })).toBeVisible();
    },
  },
  {
    name: "parent",
    open: async (p) => {
      await p.getByRole("button", { name: "אזור הורים" }).click();
      await enterParent(p);
      await expect(p.getByRole("heading", { name: "אזור הורים" })).toBeVisible();
    },
  },
];

const seeded = () =>
  family([profile({ ledger: [stars(40)], memory: { hello: { ef: 2.3, interval: 1, reps: 4, due: "2099-01-01", firstSeen: "2026-01-01", lastReviewed: "", lapses: 0 } } })]);

for (const s of SCREENS) {
  test(`quality · ${s.name}`, async ({ page }, info) => {
    const errors = await setup(page, { state: seeded() });
    await page.goto("/");
    await s.open(page);
    await page.waitForTimeout(800);

    // 1. No horizontal scrolling.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1);

    // 2. RTL app chrome; every English learning word is isolated LTR.
    expect(await page.getAttribute("html", "dir")).toBe("rtl");
    const badEnglish = await page.evaluate(() =>
      [...document.querySelectorAll(".en")].filter((el) => getComputedStyle(el).direction !== "ltr").map((el) => el.textContent),
    );
    expect(badEnglish, "English text not LTR").toEqual([]);

    // 3. Touch targets (child screens): report anything under 56px.
    if (s.name !== "parent") {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .filter((b) => {
            const r = b.getBoundingClientRect();
            const st = getComputedStyle(b);
            return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && (r.width < 56 || r.height < 56);
          })
          .map((b) => `${b.getAttribute("aria-label") ?? b.textContent?.trim().slice(0, 20)} ${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)}`),
      );
      info.annotations.push({ type: "small-targets", description: JSON.stringify(small) });
    }

    // 4. Accessibility.
    // axe bundles its own playwright-core types; the page object is the same at runtime.
    const axe = await new AxeBuilder({ page: page as never }).disableRules(["region"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    info.annotations.push({
      type: "axe",
      description: JSON.stringify(axe.violations.map((v) => `${v.impact} ${v.id} ×${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`)),
    });
    expect(serious.map((v) => `${v.id}: ${v.help}`), "serious accessibility issues").toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("reduced motion: a quest plays without errors", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await setup(page, { state: family([profile()]), debug: true });
  await page.goto("/");
  await enterStage(page, "המאורה של לונה");
  await startQuest(page);
  await expect(page.getByText(/מילות הקסם/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("offline: the app shell, art and voices load from cache", async ({ page, context }) => {
  await setup(page, { state: family([profile()]) });
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Second load so the worker controls the page and has filled its cache.
  await page.reload();
  await page.waitForTimeout(4000);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const c = await caches.open(keys[0]);
    const reqs = await c.keys();
    return { caches: keys, emoji: reqs.filter((r) => r.url.includes("/emoji/")).length, voice: reqs.filter((r) => r.url.includes("/voice/")).length };
  });
  test.info().annotations.push({ type: "cache", description: JSON.stringify(cached) });
  expect(cached.emoji).toBeGreaterThan(100);
  expect(cached.voice).toBeGreaterThan(200);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('button[aria-label^="המאורה של לונה"]')).toBeVisible();
});
