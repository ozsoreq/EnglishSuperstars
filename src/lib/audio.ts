"use client";
/**
 * Sound and voice.
 *
 * SFX are synthesised with Web Audio (short, soft, never a buzzer).
 *
 * Voice is neural first: /api/tts returns natural Azure AI Speech audio
 * (Hebrew guide, warm English guide, English child voice, exact letter
 * sounds), played through Howler.js. If the route isn't configured or the
 * device is offline with nothing cached, it falls back to the best voice the
 * device has (preferring its "natural"/"enhanced" voices). Every spoken line
 * is also captioned on screen.
 */
import { Howl } from "howler";
import { LETTER_SOUNDS } from "./content/words";
import { ttsUrl, type TtsKind, type TtsVoice } from "./tts";


let ctx: AudioContext | null = null;
let soundOn = true;
let voiceOn = true;

export function setSound(on: boolean) {
  soundOn = on;
}
export function setVoice(on: boolean) {
  voiceOn = on;
  if (!on) stopSpeaking();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12, slideTo?: number) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export type Sfx = "tap" | "pop" | "chime" | "soft" | "whoosh" | "chug" | "flip" | "fanfare" | "goodnight";

/** `step` raises the chime's pitch for each star in a combo. */
export function sfx(name: Sfx, step = 0) {
  if (!soundOn) return;
  switch (name) {
    case "tap":
      tone(520, 0, 0.06, "triangle", 0.06);
      break;
    case "pop":
      tone(700, 0, 0.09, "sine", 0.14, 1200);
      break;
    case "flip":
      tone(400, 0, 0.08, "triangle", 0.07, 600);
      break;
    case "chime": {
      const base = 880 * Math.pow(2, Math.min(step, 12) / 12);
      tone(base, 0, 0.35, "sine", 0.1);
      tone(base * 1.5, 0.04, 0.3, "sine", 0.05);
      break;
    }
    case "soft":
      // The gentle "try again" wobble — deliberately not a buzzer.
      tone(330, 0, 0.12, "sine", 0.08, 300);
      tone(300, 0.12, 0.14, "sine", 0.07, 330);
      break;
    case "whoosh":
      tone(200, 0, 0.3, "sine", 0.05, 900);
      break;
    case "chug":
      for (let i = 0; i < 4; i++) tone(110, i * 0.18, 0.1, "square", 0.04, 80);
      tone(660, 0.75, 0.25, "triangle", 0.06, 880);
      break;
    case "fanfare":
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.35, "triangle", 0.08));
      break;
    case "goodnight":
      [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.4, 0.8, "sine", 0.05));
      break;
  }
}

// ---------------------------------------------------------------- voice

type Lang = "en" | "he";

/** "off" once the server says neural TTS isn't configured (for this session). */
let neural: "unknown" | "on" | "off" = "unknown";
const clips = new Map<string, Promise<string | null>>();
let current: Howl | null = null;
let generation = 0;

function loadClip(url: string): Promise<string | null> {
  if (neural === "off" || typeof window === "undefined") return Promise.resolve(null);
  let p = clips.get(url);
  if (!p) {
    // A slow network falls back to the device voice instead of a long silence.
    p = fetch(url, { signal: AbortSignal.timeout(4000) })
      .then(async (res) => {
        if (res.status === 501) {
          neural = "off";
          return null;
        }
        if (!res.ok) return null;
        neural = "on";
        return URL.createObjectURL(await res.blob());
      })
      .catch(() => null);
    clips.set(url, p);
    void p.then((v) => {
      if (!v) clips.delete(url);
    });
  }
  return p;
}

function playClip(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const howl = new Howl({ src: [src], format: ["mp3"] });
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      howl.unload();
      if (current === howl) current = null;
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true), 20_000);
    howl.once("end", () => finish(true));
    howl.once("stop", () => finish(true));
    howl.once("loaderror", () => finish(false));
    howl.once("playerror", () => finish(false));
    current = howl;
    howl.play();
  });
}

function deviceVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

/** Prefer the device's most natural voices over the robotic defaults. */
function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural/.test(n)) s += 60;
  if (/premium|enhanced/.test(n)) s += 45;
  if (/online/.test(n)) s += 20;
  if (/google/.test(n)) s += 15;
  if (/jenny|aria|ava|samantha|allison|karen|moira|tessa|hila|carmit/.test(n)) s += 10;
  if (/compact|espeak|robot/.test(n)) s -= 40;
  if (v.lang === "en-US" || v.lang === "he-IL") s += 5;
  return s;
}

function pickDeviceVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const prefix = lang === "he" ? ["he", "iw"] : ["en"];
  return deviceVoices()
    .filter((v) => prefix.some((p) => v.lang.toLowerCase().startsWith(p)))
    .sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

export function canSpeak(lang: Lang): boolean {
  if (neural === "on") return true;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return lang === "en" || Boolean(pickDeviceVoice("he"));
}

export function stopSpeaking() {
  generation += 1;
  current?.stop();
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function deviceSpeak(text: string, lang: Lang, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return resolve();
    const voice = pickDeviceVoice(lang);
    if (lang === "he" && !voice) return resolve(); // Caption still shows.
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "he" ? "he-IL" : "en-US";
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.05;
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 1500 + text.length * 120);
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

interface SpeakOptions {
  kind?: TtsKind;
  voice?: TtsVoice;
  /** What the device voice says if neural audio isn't available. */
  fallbackText?: string;
  /** Device-voice rate. */
  rate?: number;
}

/**
 * Speak one line. Resolves when finished, interrupted, or after a cap —
 * games await speech between steps, so a stalled network fetch or audio
 * engine must never freeze a game.
 */
export function speak(text: string, lang: Lang, opts: SpeakOptions = {}): Promise<void> {
  const cap = 6000 + text.length * 150;
  return Promise.race([speakNow(text, lang, opts), new Promise<void>((r) => setTimeout(r, cap))]);
}

async function speakNow(text: string, lang: Lang, opts: SpeakOptions): Promise<void> {
  if (!voiceOn || !text) return;
  const my = ++generation;
  const kind = opts.kind ?? "line";
  const src = await loadClip(ttsUrl({ text, lang, kind, voice: opts.voice ?? "guide" }));
  if (my !== generation) return;
  current?.stop(); // never talk over ourselves
  if (src && (await playClip(src))) return;
  if (my !== generation) return;
  await deviceSpeak(opts.fallbackText ?? text, lang, opts.rate ?? (kind === "line" ? (lang === "en" ? 0.85 : 1) : 0.7));
}

/** Speak an English word clearly. The child voice models words for the child to copy. */
export function sayWord(en: string, voice: TtsVoice = "guide"): Promise<void> {
  return speak(en, "en", { kind: "word", voice });
}

/** A letter's sound (not its name), e.g. "b" → /bə/. */
export function saySound(letter: string): Promise<void> {
  return speak(letter, "en", { kind: "sound", fallbackText: LETTER_SOUNDS[letter] ?? letter });
}

/** Warm the cache for lines and words coming up next (no-op without neural TTS). */
export function preloadSpeech(items: { text: string; lang: Lang; kind?: TtsKind; voice?: TtsVoice }[]) {
  if (!voiceOn || neural === "off") return;
  for (const i of items) void loadClip(ttsUrl({ text: i.text, lang: i.lang, kind: i.kind ?? "line", voice: i.voice ?? "guide" }));
}

export async function speakLines(lines: { text: string; lang: Lang }[]) {
  for (const l of lines) await speak(l.text, l.lang);
}

// Device voices load asynchronously in Chrome.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => deviceVoices();
}
