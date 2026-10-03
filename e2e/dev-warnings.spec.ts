/**
 * Development-build sweep: walks the main screens against `next dev` and
 * fails on any React warning or error. Run with:
 *   E2E_DEV_URL=http://localhost:3300 npx playwright test e2e/dev-warnings.spec.ts --project tablet
 */
import { expect, test } from "@playwright/test";
import { enterParent, enterStage, family, openCamp, openDebugPanel, profile, setup, skipQuest, stars, toStarMoment } from "./helpers";

const DEV = process.env.E2E_DEV_URL;

test("no React warnings across the app (dev build)", async ({ page }, info) => {
  test.skip(!DEV || info.project.name !== "tablet", "set E2E_DEV_URL to a running `next dev`");
  test.setTimeout(240_000);
  const logs: string[] = [];
  page.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !/Download the React DevTools|\[Fast Refresh\]|HMR|Vercel Web Analytics|status of 501|status of 404/.test(m.text()))
      logs.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  const failed: string[] = [];
  // Aborted = the app's own 4 s speech-clip timeout (dev compiles /api/tts on first use).
  page.on("requestfailed", (r) => r.failure()?.errorText !== "net::ERR_ABORTED" && failed.push(r.url()));
  const errors = await setup(page, { state: family([profile({ ledger: [stars(500)] })]), debug: true });
  await page.goto(DEV!);
  await enterStage(page, "המאורה של לונה");
  await skipQuest(page);
  await toStarMoment(page);
  await page.getByRole("button", { name: /להמשיך לחקור/ }).click();
  await openCamp(page);
  for (const tab of ["המחנה", "חיות", "משאלות", "ציוד"]) await page.getByRole("button", { name: new RegExp(tab) }).first().click();
  await page.getByRole("button", { name: /^10$/ }).first().click();
  await page.getByRole("button", { name: "חזרה" }).click();
  await page.getByRole("button", { name: "יומן", exact: true }).click();
  await page.getByRole("button", { name: "חזרה" }).click();
  await page.getByRole("button", { name: "ים", exact: true }).click();
  await page.getByRole("button", { name: "חזרה" }).click();
  await openDebugPanel(page);
  await page.getByRole("button", { name: "Goodnight (bedtime)" }).click();
  await page.mouse.click(500, 300);
  await page.getByRole("button", { name: "אזור הורים" }).click();
  await enterParent(page);
  for (const tab of ["התקדמות", "זמן מסך", "פרסים וכוכבים", "משפחה", "פרטיות"]) await page.getByRole("button", { name: tab }).click();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  info.annotations.push({ type: "failed-requests", description: JSON.stringify(failed) });
  // Failed external requests (e.g. analytics in a sandbox) aren't React problems.
  expect(logs.filter((l) => !l.includes("Failed to load resource: net::"))).toEqual([]);
  expect(failed.filter((u) => u.startsWith(DEV!))).toEqual([]);
});
