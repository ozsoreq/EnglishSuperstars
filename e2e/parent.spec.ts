import { expect, test } from "@playwright/test";
import { activeProfile, earnedBy, enterParent, family, profile, readFamily, setup, today } from "./helpers";

test("parent gate rejects a wrong answer and a wrong PIN", async ({ page }) => {
  await setup(page, { state: family([profile()]) });
  await page.goto("/");
  await page.getByRole("button", { name: "אזור הורים" }).click();
  await enterParent(page, "1234", { wrongMath: true });
  await expect(page.getByText("התשובה לתרגיל לא נכונה")).toBeVisible();
  await enterParent(page, "9999");
  await expect(page.getByText("קוד שגוי")).toBeVisible();
  await enterParent(page, "1234");
  await expect(page.getByRole("heading", { name: "אזור הורים" })).toBeVisible();
});

test("first visit creates a PIN and requires it twice", async ({ page }) => {
  await setup(page, { state: family([profile()], { pin: null }) });
  await page.goto("/");
  await page.getByRole("button", { name: "אזור הורים" }).click();
  const q = await page.locator("b", { hasText: "×" }).first().innerText();
  const [a, b] = q.split("×").map((s) => Number(s.trim()));
  const inputs = page.locator("input");
  await inputs.nth(0).fill(String(a * b));
  await inputs.nth(1).fill("2468");
  await inputs.nth(2).fill("2467");
  await page.getByRole("button", { name: "כניסה" }).click();
  await expect(page.getByText("הקודים לא תואמים")).toBeVisible();
  await inputs.nth(2).fill("2468");
  await page.getByRole("button", { name: "כניסה" }).click();
  await expect(page.getByRole("heading", { name: "אזור הורים" })).toBeVisible();
  expect(((await readFamily(page)).parent as { pin: string }).pin).toBe("2468");
});

test("daily time limit ends play calmly; a parent can add 10 minutes", async ({ page }) => {
  await setup(page, { state: family([profile({ playSeconds: { [today()]: 15 * 60 } })]) });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /לילה טוב/ })).toBeVisible();
  await page.getByRole("button", { name: "הורים", exact: true }).click();
  await enterParent(page);
  await page.getByRole("button", { name: "זמן מסך" }).click();
  await page.getByRole("button", { name: /10 דקות להיום/ }).click();
  await page.getByRole("button", { name: "חזרה למשחק" }).click();
  await expect(page.getByRole("heading", { name: /לילה טוב/ })).toHaveCount(0);
  await expect(page.locator('button[aria-label^="המאורה של לונה"]')).toBeVisible();
});

test("bedtime shows the goodnight screen", async ({ page }) => {
  // A bedtime one minute ago (any time before 06:00 is quiet anyway).
  const d = new Date(Date.now() - 60_000);
  const bedtime = `${String(Math.max(6, d.getHours())).padStart(2, "0")}:${String(d.getHours() < 6 ? 0 : d.getMinutes()).padStart(2, "0")}`;
  await setup(page, { state: family([profile()], { bedtime }) });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /לילה טוב/ })).toBeVisible();
});

test("bonus stars, rewards editor, export and erase", async ({ page }) => {
  await setup(page, { state: family([profile()]) });
  await page.goto("/");
  await page.getByRole("button", { name: "אזור הורים" }).click();
  await enterParent(page);
  await page.getByRole("button", { name: "פרסים וכוכבים" }).click();
  await page.getByRole("button", { name: "שליחה" }).click();
  await expect(page.getByText(/נשלחו 5 כוכבים/)).toBeVisible();
  expect(earnedBy((await activeProfile(page)).ledger, "parent")).toBe(5);

  await page.getByPlaceholder("שם הפרס").fill("גלידה");
  await page.getByRole("button", { name: "הוספה" }).click();
  await expect(page.getByText(/גלידה — 100/)).toBeVisible();
  await page.locator("li", { hasText: "גלידה" }).getByRole("button", { name: "מחיקה" }).click();
  await expect(page.getByText(/גלידה — 100/)).toHaveCount(0);

  await page.getByRole("button", { name: "פרטיות" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ייצוא נתונים" }).click();
  expect((await download).suggestedFilename()).toMatch(/^kochavim-.*\.json$/);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "מחיקת כל הנתונים" }).click();
  await page.getByRole("button", { name: "חזרה למשחק" }).click();
  await expect(page.getByRole("button", { name: /נעים מאוד, לונה/ })).toBeVisible();
});

test("a second child gets their own profile and progress", async ({ page }) => {
  await setup(page, { state: family([profile({ visits: { "luna-den": 1 }, location: "rainbow-falls" })]) });
  await page.goto("/");
  await page.getByRole("button", { name: "אזור הורים" }).click();
  await enterParent(page);
  await page.getByRole("button", { name: "משפחה" }).click();
  await page.getByRole("button", { name: /הוספת ילד/ }).click();
  await page.getByRole("button", { name: /נעים מאוד, לונה/ }).click();
  await page.getByPlaceholder("שם או כינוי").fill("Avi");
  await page.getByRole("button", { name: "דמות 7" }).click();
  await page.getByRole("button", { name: /יוצאים לדרך/ }).click();
  await expect(page.getByText("Avi").first()).toBeVisible();
  const f = await readFamily(page);
  expect(f.profiles).toHaveLength(2);
  const avi = f.profiles.find((p) => p.name === "Avi") as { visits: Record<string, number> };
  expect(avi.visits).toEqual({});
  // Switch back through the explorer picker.
  await page.getByRole("button", { name: "החלפת מגלה" }).click();
  await page.getByRole("button", { name: /Noa/ }).click();
  expect((await activeProfile(page)).name).toBe("Noa");
});

test("?debug=1 needs the parent gate before debug mode turns on", async ({ page }) => {
  await setup(page, { state: family([profile()]) });
  await page.goto("/?debug=1");
  await expect(page.getByRole("heading", { name: /כניסת הורים/ })).toBeVisible();
  await page.getByRole("button", { name: "ביטול" }).click();
  await expect(page.getByRole("button", { name: "Debug panel" })).toHaveCount(0);
  expect(new URL(page.url()).search).toBe("");

  await page.goto("/?debug=1");
  await enterParent(page);
  await expect(page.getByRole("button", { name: "Debug panel" })).toBeVisible();
});
