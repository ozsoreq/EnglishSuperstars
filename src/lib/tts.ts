/**
 * Neural text-to-speech request rules, shared by the /api/tts route and the
 * client. Pure, so it can be unit-tested and validated on the server.
 *
 * Provider: Azure AI Speech neural voices — natural Hebrew (he-IL), a warm
 * adult English guide, and a child English voice, with SSML for pace,
 * a friendly speaking style and exact letter *sounds* via IPA phonemes.
 */

export type TtsLang = "he" | "en";
/** line = Luna talking; word = a clear, slower model word; sound = a letter sound. */
export type TtsKind = "line" | "word" | "sound";
export type TtsVoice = "guide" | "child";

export interface TtsRequest {
  text: string;
  lang: TtsLang;
  kind: TtsKind;
  voice: TtsVoice;
}

export const MAX_TTS_CHARS = 240;

export const DEFAULT_VOICES = {
  he: "he-IL-HilaNeural",
  en: "en-US-JennyNeural",
  child: "en-US-AnaNeural",
} as const;

/** IPA for each letter's sound (not its name), for phonics. */
export const LETTER_IPA: Record<string, string> = {
  a: "æ",
  b: "bə",
  c: "kə",
  d: "də",
  e: "ɛ",
  f: "fː",
  g: "ɡə",
  h: "hə",
  i: "ɪ",
  j: "dʒə",
  k: "kə",
  l: "lː",
  m: "mː",
  n: "nː",
  o: "ɑ",
  p: "pə",
  q: "kwə",
  r: "ɹː",
  s: "sː",
  t: "tə",
  u: "ʌ",
  v: "vː",
  w: "wə",
  x: "ks",
  y: "jə",
  z: "zː",
};

/**
 * Stable id for a pre-recorded clip: FNV-1a 64 over "lang|kind|voice|text"
 * (UTF-8), as 16 hex chars. scripts/voice/generate.py computes the same.
 */
export function voiceKey(r: TtsRequest): string {
  const bytes = new TextEncoder().encode(`${r.lang}|${r.kind}|${r.voice}|${r.text}`);
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

export function ttsUrl(r: TtsRequest): string {
  const q = new URLSearchParams({ text: r.text, lang: r.lang, kind: r.kind, voice: r.voice });
  return `/api/tts?${q.toString()}`;
}

/** Validate untrusted query params; returns null when the request isn't allowed. */
export function parseTtsRequest(params: URLSearchParams): TtsRequest | null {
  const text = (params.get("text") ?? "").trim();
  const lang = params.get("lang");
  const kind = params.get("kind") ?? "line";
  const voice = params.get("voice") ?? "guide";
  if (lang !== "he" && lang !== "en") return null;
  if (kind !== "line" && kind !== "word" && kind !== "sound") return null;
  if (voice !== "guide" && voice !== "child") return null;
  if (!text || text.length > MAX_TTS_CHARS) return null;
  if (kind === "sound" && !LETTER_IPA[text]) return null;
  if (lang === "he" && (kind !== "line" || voice !== "guide")) return null;
  return { text, lang, kind, voice };
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function voiceName(r: TtsRequest, env: Partial<Record<string, string>> = {}): string {
  if (r.lang === "he") return env.AZURE_TTS_VOICE_HE || DEFAULT_VOICES.he;
  if (r.voice === "child") return env.AZURE_TTS_VOICE_CHILD || DEFAULT_VOICES.child;
  return env.AZURE_TTS_VOICE_EN || DEFAULT_VOICES.en;
}

export function buildSsml(r: TtsRequest, voice: string): string {
  const xmlLang = r.lang === "he" ? "he-IL" : "en-US";
  let body: string;
  if (r.kind === "sound") {
    body = `<prosody rate="-10%"><phoneme alphabet="ipa" ph="${LETTER_IPA[r.text]}">${escapeXml(r.text)}</phoneme></prosody>`;
  } else if (r.kind === "word") {
    body = `<prosody rate="-20%">${escapeXml(r.text)}</prosody>`;
  } else if (r.lang === "en" && r.voice === "guide") {
    // Luna: warm and playful, a touch slower for a young learner.
    body = `<mstts:express-as style="friendly"><prosody rate="-8%">${escapeXml(r.text)}</prosody></mstts:express-as>`;
  } else {
    body = `<prosody rate="-5%">${escapeXml(r.text)}</prosody>`;
  }
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${xmlLang}">` +
    `<voice name="${voice}">${body}</voice></speak>`
  );
}
