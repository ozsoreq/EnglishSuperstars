import { describe, expect, it } from "vitest";
import { EMPTY_STREAK, completeDay, streakBonus } from "./streak";

describe("streak", () => {
  it("advances once per day", () => {
    let s = completeDay(EMPTY_STREAK, "2026-10-04").streak;
    expect(completeDay(s, "2026-10-04").advanced).toBe(false);
    s = completeDay(s, "2026-10-05").streak;
    expect(s.count).toBe(2);
  });

  it("uses one snow day per week, then resets gently", () => {
    let s = { count: 4, lastDay: "2026-10-04", snowDayWeek: "" };
    const r = completeDay(s, "2026-10-06");
    expect(r.usedSnowDay).toBe(true);
    expect(r.streak.count).toBe(5);
    s = r.streak;
    expect(completeDay(s, "2026-10-08").streak.count).toBe(1);
  });

  it("caps the bonus at 7", () => {
    expect(streakBonus(30)).toBe(7);
  });
});
