import { describe, expect, it } from "vitest";
import { DAILY_CAP, balance, earn, levelFor, spend, totalEarned, type Ledger } from "./ledger";

const day = "2026-10-03";
const prices = (id: string) => ({ hat: 20, castle: 600 } as Record<string, number>)[id];

describe("ledger", () => {
  it("earns within the rules and derives the balance", () => {
    const r = earn([], { key: "a1", reason: "activity", amount: 3, day });
    expect(r.ok && balance(r.ledger)).toBe(3);
  });

  it("rejects amounts outside the earning table", () => {
    expect(earn([], { key: "a", reason: "activity", amount: 4, day }).ok).toBe(false);
    expect(earn([], { key: "m", reason: "mission", amount: 50, day }).ok).toBe(false);
    expect(earn([], { key: "f", reason: "activity", amount: 1.5, day }).ok).toBe(false);
  });

  it("is idempotent per key", () => {
    let l: Ledger = [];
    for (let i = 0; i < 3; i++) {
      const r = earn(l, { key: "mission:today", reason: "mission", amount: 5, day });
      l = r.ledger;
    }
    expect(balance(l)).toBe(5);
    expect(l).toHaveLength(1);
  });

  it("clamps to the daily cap, then refuses", () => {
    let l: Ledger = [];
    for (let i = 0; i < 25; i++) l = earn(l, { key: `a${i}`, reason: "activity", amount: 3, day }).ledger;
    expect(balance(l)).toBe(DAILY_CAP);
    const r = earn(l, { key: "more", reason: "activity", amount: 1, day });
    expect(r.ok).toBe(false);
    // Island bonus and parent stars are not capped; the cap resets tomorrow.
    expect(earn(l, { key: "isl", reason: "island", amount: 50, day }).ok).toBe(true);
    expect(earn(l, { key: "p", reason: "parent", amount: 10, day }).ok).toBe(true);
    expect(earn(l, { key: "t", reason: "activity", amount: 3, day: "2026-10-04" }).ok).toBe(true);
  });

  it("validates spends against the price list and balance", () => {
    let l = earn([], { key: "p", reason: "parent", amount: 30, day }).ledger;
    expect(spend(l, { key: "s1", itemId: "hat", price: 1, day }, prices).ok).toBe(false);
    expect(spend(l, { key: "s1", itemId: "nope", price: 20, day }, prices).ok).toBe(false);
    expect(spend(l, { key: "s2", itemId: "castle", price: 600, day }, prices)).toMatchObject({ ok: false, error: "insufficient" });
    const r = spend(l, { key: "s3", itemId: "hat", price: 20, day }, prices);
    expect(r.ok && balance(r.ledger)).toBe(10);
    l = r.ledger;
    // Retrying the same purchase can't double-spend.
    expect(balance(spend(l, { key: "s3", itemId: "hat", price: 20, day }, prices).ledger)).toBe(10);
  });

  it("levels from lifetime earned, so spending never lowers it", () => {
    let l = earn([], { key: "p", reason: "parent", amount: 100, day }).ledger;
    const before = levelFor(totalEarned(l));
    l = spend(l, { key: "s", itemId: "hat", price: 20, day }, prices).ledger;
    expect(levelFor(totalEarned(l))).toBe(before);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(1e9)).toBe(50);
  });
});
