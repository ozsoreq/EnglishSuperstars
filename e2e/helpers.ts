import { expect, type Page } from "@playwright/test";

export const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Json = Record<string, unknown>;

export function profile(over: Json = {}): Json {
  return {
    id: "kid-1",
    name: "Noa",
    avatar: "👧🏽",
    createdAt: Date.now(),
    ledger: [],
    memory: {},
    visits: {},
    location: "luna-den",
    islandsDone: [],
    streak: { count: 0, lastDay: "", snowDayWeek: "" },
    owned: [],
    equipped: {},
    pets: [],
    playSeconds: {},
    spokenByWeek: {},
    speakScores: [],
    requests: [],
    levelSeen: 1,
    ...over,
  };
}

export function family(profiles: Json[] = [profile()], parent: Json = {}): Json {
  return {
    version: 1,
    activeId: (profiles[0]?.id as string) ?? null,
    profiles,
    parent: {
      pin: "1234",
      dailyMinutes: 15,
      bedtime: "23:59",
      rewards: [{ id: "r-movie", title: "סרט", price: 150 }],
      sound: true,
      voice: true,
      extraMinutes: {},
      ...parent,
    },
  };
}

export const stars = (amount: number, reason = "parent", day = today()) => ({
  key: `seed-${reason}-${amount}-${Math.random()}`,
  ts: Date.now(),
  day,
  kind: "earn",
  reason,
  amount,
});

/**
 * Prepare a page: optional seeded family state, debug mode, instant device
 * speech, and no speech recognition (so mics become "I said it!").
 */
export async function setup(page: Page, opts: { state?: Json; debug?: boolean } = {}) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ state, debug }) => {
      if (state && !sessionStorage.getItem("qa-seeded")) {
        localStorage.setItem("kochavim:v1", JSON.stringify(state));
        sessionStorage.setItem("qa-seeded", "1");
      }
      localStorage.setItem("kochavim:debug", debug ? "1" : "0");
      const w = window as unknown as Record<string, unknown>;
      w.__spoken = [];
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        (w.__spoken as string[]).push(`${u.lang}:${u.text}`);
        setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 20);
      };
      delete w.webkitSpeechRecognition;
      delete w.SpeechRecognition;
    },
    { state: opts.state ?? null, debug: opts.debug ?? false },
  );
  return errors;
}

export async function readFamily(page: Page): Promise<Json & { profiles: Json[] }> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("kochavim:v1") ?? "{}"));
}

export async function activeProfile(page: Page) {
  const f = await readFamily(page);
  return f.profiles.find((p) => p.id === f.activeId) as Json & {
    ledger: { reason: string; amount: number; kind: string }[];
    visits: Record<string, number>;
    memory: Record<string, { reps: number }>;
    streak: { count: number };
    islandsDone: string[];
    location: string;
    owned: string[];
    equipped: Record<string, string>;
    pets: { itemId: string; fedDay: string; tricks: string[] }[];
    requests: { status: string }[];
    savingGoal?: string;
  };
}

export const earnedBy = (ledger: { reason: string; amount: number; kind: string }[], reason: string) =>
  ledger.filter((e) => e.kind === "earn" && e.reason === reason).reduce((s, e) => s + e.amount, 0);

export const balanceOf = (ledger: { amount: number; kind: string }[]) =>
  ledger.reduce((s, e) => s + (e.kind === "earn" ? e.amount : -e.amount), 0);

/** Dismiss the level-up overlay if it's in the way. */
async function dismissOverlays(page: Page) {
  const lvl = page.locator(".fixed.inset-0.z-\\[55\\]");
  if (await lvl.isVisible().catch(() => false)) await lvl.click({ timeout: 1000 }).catch(() => {});
}

/**
 * Play the current quest's activities until the "restored" screen, answering
 * correctly (debug-mode `data-qa` markers) unless `mistakes` is set, in which
 * case the first item of each round is answered wrong twice.
 */
export async function playUntilRestored(page: Page, opts: { mistakes?: boolean; maxMs?: number } = {}) {
  const deadline = Date.now() + (opts.maxMs ?? 150_000);
  const next = page.locator("button.bg-gold", { hasText: "הלאה" });
  let erred = 0;
  while (Date.now() < deadline) {
    await dismissOverlays(page);
    if (await next.isVisible().catch(() => false)) return;
    const said = page.getByText("אמרתי!");
    if (await said.isVisible().catch(() => false)) {
      await said.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(700);
      continue;
    }
    // Memory: open both cards of one pair.
    const closed = page.locator('button[aria-label="פרח סגור"][data-qa]');
    if (await closed.count()) {
      const word = await closed.first().getAttribute("data-qa");
      const pair = page.locator(`button[aria-label="פרח סגור"][data-qa="${word}"]`);
      await pair.nth(0).click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(250);
      await pair.nth(0).click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }
    // Feed the Dolphin: feed exactly the asked number, then done.
    const counter = page.locator("[data-qa-count]");
    if (await counter.count()) {
      const n = Number(await counter.getAttribute("data-qa-count"));
      const fed = await page.locator('button[aria-label="להחזיר דג"]').count();
      if (fed < n) await page.locator('[data-qa="fish"]').first().click({ timeout: 1500, force: true }).catch(() => {});
      else if (fed > n) await page.locator('button[aria-label="להחזיר דג"]').first().click({ timeout: 1500, force: true }).catch(() => {});
      else {
        await page.locator('[data-qa="done"]').click({ timeout: 1500, force: true }).catch(() => {});
        await page.waitForTimeout(900);
      }
      await page.waitForTimeout(150);
      continue;
    }
    // Letter Trace: tap the dots in order.
    const dot0 = page.locator('[data-qa="dot-0"]');
    if (await dot0.count()) {
      const dots = await page.locator('[data-qa^="dot-"]').count();
      for (let i = 0; i < dots; i++) {
        await page.locator(`[data-qa="dot-${i}"]`).click({ timeout: 1500, force: true }).catch(() => {});
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(1200);
      continue;
    }
    const wrong = page.locator('[data-qa="wrong"]');
    const answer = page.locator('[data-qa="answer"]');
    if (opts.mistakes && erred < 2 && (await wrong.count())) {
      await wrong.first().click({ timeout: 1500, force: true }).catch(() => {});
      erred++;
      await page.waitForTimeout(900);
      continue;
    }
    if (await answer.count()) {
      await answer.first().click({ timeout: 1500, force: true }).catch(() => {});
      erred = 0;
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(300);
  }
  throw new Error("Quest did not reach the restored screen in time");
}

/** From the restored screen to the star moment. */
export async function toStarMoment(page: Page) {
  const next = page.locator("button.bg-gold", { hasText: "הלאה" });
  for (let i = 0; i < 6; i++) {
    await dismissOverlays(page);
    if (await page.getByRole("button", { name: /להמשיך לחקור/ }).isVisible().catch(() => false)) return;
    await next.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  await expect(page.getByRole("button", { name: /להמשיך לחקור/ })).toBeVisible();
}

export async function openDebugPanel(page: Page) {
  await page.getByRole("button", { name: "Debug panel" }).click();
  await expect(page.getByRole("heading", { name: /Debug mode/ })).toBeVisible();
}

/** Tap the arrival button until the quest starts (taps during a view transition are swallowed). */
export async function startQuest(page: Page) {
  const btn = page.getByRole("button", { name: /יוצאים להרפתקה|מתחילים/ });
  await expect(btn).toBeVisible();
  for (let i = 0; i < 10; i++) {
    if (!(await btn.isVisible().catch(() => false))) return;
    await btn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  await expect(btn).toBeHidden();
}

/** Debug mode: finish the current quest instantly via the skip button. */
export async function skipQuest(page: Page) {
  const skip = page.getByRole("button", { name: "Debug: skip this step" });
  const next = page.locator("button.bg-gold", { hasText: "הלאה" });
  await expect(skip).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (await next.isVisible().catch(() => false)) return;
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  await expect(next).toBeVisible();
}

/** Tap a map stop until its quest opens (taps during a view transition are swallowed). */
export async function enterStage(page: Page, nameHe: string) {
  const stop = page.locator(`button[aria-label^="${nameHe}"]`);
  const heading = page.getByRole("heading", { level: 1, name: new RegExp(nameHe) });
  await expect(stop).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await stop.click({ force: true, timeout: 1500 }).catch(() => {});
    if (await heading.isVisible({ timeout: 2500 }).catch(() => false)) return;
  }
  await expect(heading).toBeVisible();
}

/** Open the parent area and pass the gate (math + PIN). */
export async function enterParent(page: Page, pin = "1234", opts: { wrongMath?: boolean } = {}) {
  const q = await page.locator("b", { hasText: "×" }).first().innerText();
  const [a, b] = q.split("×").map((s) => Number(s.trim()));
  const inputs = page.locator("input");
  await inputs.nth(0).fill(String(opts.wrongMath ? a * b + 1 : a * b));
  await inputs.nth(1).fill(pin);
  if ((await inputs.count()) > 2) await inputs.nth(2).fill(pin);
  await page.getByRole("button", { name: "כניסה" }).click();
}

export async function openCamp(page: Page) {
  await page.getByRole("button", { name: "מחנה", exact: true }).click();
  await expect(page.getByRole("heading", { name: /מחנה המגלים/ })).toBeVisible();
}
