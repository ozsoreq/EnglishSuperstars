import { describe, expect, it } from "vitest";
import { dueWords, mastery, review } from "./srs";
import { addDays } from "./dates";

const d0 = "2026-10-03";

describe("srs", () => {
  it("grows intervals on success and reaches gold after spaced reviews", () => {
    let m = review(undefined, 5, d0);
    expect(m.due).toBe(addDays(d0, 1));
    let day = d0;
    for (let i = 0; i < 3; i++) {
      day = m.due;
      m = review(m, 5, day);
    }
    expect(m.reps).toBe(4);
    expect(mastery(m)).toBe("gold");
    expect(m.interval).toBeGreaterThan(2);
  });

  it("counts only the first review of the day", () => {
    const m = review(undefined, 5, d0);
    expect(review(m, 5, d0)).toEqual(m);
  });

  it("brings a missed word back tomorrow", () => {
    let m = review(undefined, 5, d0);
    m = review(m, 5, m.due);
    const missed = review(m, 1, m.due);
    expect(missed.reps).toBe(0);
    expect(missed.due).toBe(addDays(m.due, 1));
    // A miss later on an already-reviewed day still schedules early review.
    const same = review(review(undefined, 5, d0), 1, d0);
    expect(same.due).toBe(addDays(d0, 1));
  });

  it("lists due words, most overdue first", () => {
    const a = { ...review(undefined, 5, d0), due: "2026-10-01" };
    const b = { ...review(undefined, 5, d0), due: "2026-10-02" };
    const c = { ...review(undefined, 5, d0), due: "2026-10-09" };
    expect(dueWords({ b, a, c }, d0)).toEqual(["a", "b"]);
  });
});
