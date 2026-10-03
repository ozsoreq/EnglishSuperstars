import { describe, expect, it } from "vitest";
import { isMatch } from "./speech-match";

describe("isMatch", () => {
  it.each([
    ["hello", "hello"],
    ["Hello!", "hello"],
    ["it's a cat", "cat"],
    ["okay", "ok"],
    ["thanks", "thank you"],
    ["3", "three"],
    ["tree", "three"],
    ["for", "four"],
    ["jelly fish", "jellyfish"],
    ["yelow", "yellow"],
  ])("accepts %s for %s", (heard, target) => {
    expect(isMatch(heard, target)).toBe(true);
  });

  it.each([
    ["dog", "cat"],
    ["blue", "red"],
    ["", "red"],
    ["bed", "bad"],
  ])("rejects %s for %s", (heard, target) => {
    expect(isMatch(heard, target)).toBe(false);
  });
});
