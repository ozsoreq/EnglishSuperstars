/**
 * Lenient matching of what speech recognition heard against the target word,
 * tuned for an 8-year-old Hebrew speaker: small slips and the classic
 * Hebrew-accent substitutions (th→d/z/t, w→v, short i ↔ ee, dropped final g)
 * still count.
 */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMBER_WORDS: Record<string, string> = {
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
};

/** Map common accent/recogniser variants onto one spelling. */
function accentFold(s: string): string {
  return s
    .split(" ")
    .map((t) => NUMBER_WORDS[t] ?? t)
    .join(" ")
    .replace(/th/g, "d")
    .replace(/w/g, "v")
    .replace(/ee|ea/g, "i")
    .replace(/ng\b/g, "n")
    .replace(/ck/g, "k")
    .replace(/c/g, "k")
    .replace(/(.)\1/g, "$1");
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

const SOUND_ALIKES: Record<string, string[]> = {
  ok: ["okay", "o k", "okey"],
  hello: ["hallo", "hullo", "halo"],
  goodbye: ["good bye", "bye", "bye bye"],
  "thank you": ["thanks", "thank u", "thankyou"],
  two: ["to", "too"],
  three: ["tree", "free", "sree"],
  four: ["for", "fore"],
  eight: ["ate"],
  one: ["won"],
  red: ["read"],
  blue: ["blew"],
  no: ["know", "now"],
};

export function isMatch(heard: string, target: string): boolean {
  const h = normalize(heard);
  const t = normalize(target);
  if (!h || !t) return false;
  if (h === t) return true;

  const tokens = h.split(" ");
  // Single-word target said inside a phrase ("it's a cat").
  if (!t.includes(" ") && tokens.includes(t)) return true;
  if (t.includes(" ") && h.includes(t)) return true;

  const alikes = SOUND_ALIKES[t] ?? [];
  if (alikes.some((a) => h === a || tokens.includes(a))) return true;

  const fh = accentFold(h);
  const ft = accentFold(t);
  if (fh === ft || (!ft.includes(" ") && fh.split(" ").includes(ft))) return true;

  // Small slips, scaled to word length; very short words must be exact.
  const tolerance = ft.length <= 3 ? 0 : ft.length <= 6 ? 1 : 2;
  return [fh, ...fh.split(" ")].some((cand) => levenshtein(cand, ft) <= tolerance);
}

export function anyMatch(alternatives: string[], target: string): boolean {
  return alternatives.some((alt) => isMatch(alt, target));
}
