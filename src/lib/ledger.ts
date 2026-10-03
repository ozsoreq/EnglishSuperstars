/**
 * The star ledger: an append-only list of earn/spend rows.
 *
 * Every write carries an idempotency key, is validated against the earning
 * rules, the daily cap and the price list, and never mutates history. The
 * balance is always derived from the rows, so it can't drift or be
 * double-spent. This module is pure so the same rules can run on the server
 * (spec: "star ledger is server-authoritative") and on the device.
 */

export const DAILY_CAP = 60;

export type EarnReason =
  | "activity"
  | "mission"
  | "speak"
  | "streak"
  | "mastered"
  | "island"
  | "weekly"
  | "parent"
  | "refund";

interface Rule {
  min: number;
  max: number;
  /** Counts toward the daily cap. */
  capped: boolean;
  /** Counts toward lifetime "total earned" (which sets the level). */
  lifetime: boolean;
}

export const EARN_RULES: Record<EarnReason, Rule> = {
  activity: { min: 1, max: 3, capped: true, lifetime: true },
  mission: { min: 5, max: 5, capped: true, lifetime: true },
  speak: { min: 1, max: 1, capped: true, lifetime: true },
  streak: { min: 1, max: 7, capped: true, lifetime: true },
  mastered: { min: 2, max: 2, capped: true, lifetime: true },
  island: { min: 50, max: 50, capped: false, lifetime: true },
  weekly: { min: 15, max: 15, capped: true, lifetime: true },
  parent: { min: 1, max: 500, capped: false, lifetime: true },
  refund: { min: 1, max: 10_000, capped: false, lifetime: false },
};

export interface LedgerEntry {
  key: string;
  ts: number;
  day: string;
  kind: "earn" | "spend";
  reason: string;
  amount: number;
  note?: string;
}

export type Ledger = LedgerEntry[];

export type LedgerResult =
  | { ok: true; ledger: Ledger; amount: number; duplicate: boolean }
  | { ok: false; ledger: Ledger; error: "invalid_amount" | "cap_reached" | "insufficient" | "bad_price" };

export function balance(ledger: Ledger): number {
  return ledger.reduce((sum, e) => sum + (e.kind === "earn" ? e.amount : -e.amount), 0);
}

export function totalEarned(ledger: Ledger): number {
  return ledger
    .filter((e) => e.kind === "earn" && EARN_RULES[e.reason as EarnReason]?.lifetime)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function cappedEarnedOn(ledger: Ledger, day: string): number {
  return ledger
    .filter((e) => e.kind === "earn" && e.day === day && EARN_RULES[e.reason as EarnReason]?.capped)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function earnedOn(ledger: Ledger, day: string): number {
  return ledger
    .filter((e) => e.kind === "earn" && e.day === day && e.reason !== "refund")
    .reduce((sum, e) => sum + e.amount, 0);
}

export function spentTotal(ledger: Ledger): number {
  return ledger.filter((e) => e.kind === "spend").reduce((s, e) => s + e.amount, 0);
}

export function has(ledger: Ledger, key: string): boolean {
  return ledger.some((e) => e.key === key);
}

export interface EarnInput {
  key: string;
  reason: EarnReason;
  amount: number;
  day: string;
  ts?: number;
  note?: string;
}

export function earn(ledger: Ledger, input: EarnInput): LedgerResult {
  const existing = ledger.find((e) => e.key === input.key);
  if (existing) return { ok: true, ledger, amount: existing.amount, duplicate: true };

  const rule = EARN_RULES[input.reason];
  if (!rule || !Number.isInteger(input.amount) || input.amount < rule.min || input.amount > rule.max) {
    return { ok: false, ledger, error: "invalid_amount" };
  }

  let amount = input.amount;
  if (rule.capped) {
    const room = DAILY_CAP - cappedEarnedOn(ledger, input.day);
    if (room <= 0) return { ok: false, ledger, error: "cap_reached" };
    amount = Math.min(amount, room);
  }

  const entry: LedgerEntry = {
    key: input.key,
    ts: input.ts ?? Date.now(),
    day: input.day,
    kind: "earn",
    reason: input.reason,
    amount,
    note: input.note,
  };
  return { ok: true, ledger: [...ledger, entry], amount, duplicate: false };
}

export interface SpendInput {
  key: string;
  itemId: string;
  /** Price the client believes it is paying. */
  price: number;
  day: string;
  ts?: number;
  note?: string;
}

/**
 * Spend stars on an item. `priceOf` is the authoritative price list; a
 * mismatch with the client's price is rejected rather than trusted.
 */
export function spend(
  ledger: Ledger,
  input: SpendInput,
  priceOf: (itemId: string) => number | undefined,
): LedgerResult {
  const existing = ledger.find((e) => e.key === input.key);
  if (existing) return { ok: true, ledger, amount: existing.amount, duplicate: true };

  const price = priceOf(input.itemId);
  if (price === undefined || price !== input.price || !Number.isInteger(price) || price <= 0) {
    return { ok: false, ledger, error: "bad_price" };
  }
  if (balance(ledger) < price) return { ok: false, ledger, error: "insufficient" };

  const entry: LedgerEntry = {
    key: input.key,
    ts: input.ts ?? Date.now(),
    day: input.day,
    kind: "spend",
    reason: input.itemId,
    amount: price,
    note: input.note,
  };
  return { ok: true, ledger: [...ledger, entry], amount: price, duplicate: false };
}

/** Level 1–50 from lifetime stars earned; spending never lowers it. */
export function levelFor(total: number): number {
  return Math.min(50, Math.floor(Math.sqrt(total / 10)) + 1);
}

/** Lifetime stars needed to reach a level. */
export function starsForLevel(level: number): number {
  return 10 * (level - 1) ** 2;
}
