import { describe, expect, it } from "vitest";
import { inQuietHours } from "./store";

const t = (hh: number, mm = 0) => hh * 60 + mm;

describe("inQuietHours", () => {
  it("is quiet from an evening bedtime until 06:00", () => {
    expect(inQuietHours("19:30", t(19, 29))).toBe(false);
    expect(inQuietHours("19:30", t(19, 30))).toBe(true);
    expect(inQuietHours("19:30", t(23, 59))).toBe(true);
    expect(inQuietHours("19:30", t(3))).toBe(true);
    expect(inQuietHours("19:30", t(6))).toBe(false);
  });

  it("treats a midnight bedtime as midnight, not all day", () => {
    expect(inQuietHours("00:00", t(12))).toBe(false);
    expect(inQuietHours("00:00", t(23, 59))).toBe(false);
    expect(inQuietHours("00:00", t(0, 30))).toBe(true);
  });

  it("falls back to early-morning quiet hours for a blank bedtime", () => {
    expect(inQuietHours("", t(12))).toBe(false);
    expect(inQuietHours("", t(5))).toBe(true);
  });
});
