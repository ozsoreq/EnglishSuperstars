import { expect, test } from "@playwright/test";
import { activeProfile, balanceOf, enterParent, family, openCamp, profile, setup, stars, today } from "./helpers";

test("not enough stars: gentle message, and the jar can save for it", async ({ page }) => {
  const errors = await setup(page, { state: family([profile({ ledger: [stars(5)] })]) });
  await page.goto("/");
  await openCamp(page);
  await page.getByRole("button", { name: /^10$/ }).first().click();
  await expect(page.getByText(/עוד קצת כוכבים/).first()).toBeVisible();
  await page.getByRole("button", { name: "לחסוך לזה" }).first().click();
  await expect(page.getByText(/חוסכים ל/).first()).toBeVisible();
  const p = await activeProfile(page);
  expect(balanceOf(p.ledger)).toBe(5);
  expect(p.owned).toEqual([]);
  expect(p.savingGoal).toBe("gear-cap");
  expect(errors).toEqual([]);
});

test("buy, wear and take off gear", async ({ page }) => {
  await setup(page, { state: family([profile({ ledger: [stars(30)] })]) });
  await page.goto("/");
  await openCamp(page);
  await page.getByRole("button", { name: /^10$/ }).first().click();
  await expect(page.getByRole("button", { name: /✓ לבוש|לבוש/ }).first()).toBeVisible();
  let p = await activeProfile(page);
  expect(balanceOf(p.ledger)).toBe(20);
  expect(p.owned).toContain("gear-cap");
  expect(p.equipped.head).toBe("gear-cap");
  // Buying again can't double-charge.
  await page.getByRole("button", { name: /לבוש/ }).first().click();
  p = await activeProfile(page);
  expect(p.equipped.head).toBeUndefined();
  expect(balanceOf(p.ledger)).toBe(20);
});

test("a sleepy pet is fed for 2 stars and learns a trick by voice", async ({ page }) => {
  await setup(page, {
    state: family([
      profile({ ledger: [stars(10)], owned: ["pet-puppy"], activePet: "pet-puppy", pets: [{ itemId: "pet-puppy", name: "", fedDay: today(-3), tricks: [] }] }),
    ]),
  });
  await page.goto("/");
  await openCamp(page);
  await page.getByRole("button", { name: /חיות/ }).click();
  await expect(page.getByText("מנומנם ומחכה לכם")).toBeVisible();
  await page.getByRole("button", { name: /להאכיל/ }).click();
  await expect(page.getByText("שמח ושבע")).toBeVisible();
  await expect(page.getByRole("button", { name: /להאכיל/ })).toBeDisabled();
  await page.getByText("אמרתי!").first().click();
  await expect(page.getByText("✓ יודע").first()).toBeVisible();
  const p = await activeProfile(page);
  expect(balanceOf(p.ledger)).toBe(8);
  expect(p.pets[0].fedDay).toBe(today());
  expect(p.pets[0].tricks).toContain("sit");
});

test("real-world wish: stars held, parent declines, stars come back", async ({ page }) => {
  await setup(page, { state: family([profile({ ledger: [stars(200)] })]) });
  await page.goto("/");
  await openCamp(page);
  await page.getByRole("button", { name: /משאלות/ }).click();
  await page.getByRole("button", { name: /^150$/ }).click();
  await expect(page.getByText("⏳ מחכה להורים").or(page.getByText("מחכה להורים"))).toBeVisible();
  expect(balanceOf((await activeProfile(page)).ledger)).toBe(50);

  await page.getByRole("button", { name: "חזרה" }).click();
  await page.getByRole("button", { name: "אזור הורים" }).click();
  await enterParent(page);
  await page.getByRole("button", { name: "פרסים וכוכבים" }).click();
  await page.getByRole("button", { name: "החזרת כוכבים" }).click();
  await expect(page.getByText("אין בקשות פתוחות.")).toBeVisible();
  const p = await activeProfile(page);
  expect(balanceOf(p.ledger)).toBe(200);
  expect(p.requests[0].status).toBe("declined");
});
