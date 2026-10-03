"use client";
/**
 * Sound and voice.
 *
 * SFX are synthesised with Web Audio so the prototype ships without asset
 * files (short, soft, never a buzzer). Voice uses the browser's speech
 * synthesis as the fallback the spec allows until voice-actor recordings
 * exist; every spoken line is also captioned on screen.
 */

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

function voices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

function pickVoice(lang: "en" | "he"): SpeechSynthesisVoice | undefined {
  const all = voices();
  if (lang === "he") return all.find((v) => v.lang.toLowerCase().startsWith("he") || v.lang.toLowerCase().startsWith("iw"));
  const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
  return (
    en.find((v) => /samantha|female|aria|jenny|zira|google us english/i.test(v.name)) ??
    en.find((v) => v.lang === "en-US") ??
    en[0]
  );
}

export function canSpeak(lang: "en" | "he"): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  if (lang === "en") return true;
  return Boolean(pickVoice("he"));
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Speak one line. Resolves when finished (or after a safety timeout). */
export function speak(text: string, lang: "en" | "he", opts: { rate?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!voiceOn || typeof window === "undefined" || !("speechSynthesis" in window) || !text) return resolve();
    const voice = pickVoice(lang);
    if (lang === "he" && !voice) return resolve(); // Caption still shows.
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "he" ? "he-IL" : "en-US";
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? (lang === "en" ? 0.8 : 1);
    u.pitch = 1.1;
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

/** Speak an English word clearly (slower). */
export function sayWord(en: string): Promise<void> {
  return speak(en, "en", { rate: 0.7 });
}

export async function speakLines(lines: { text: string; lang: "en" | "he" }[]) {
  for (const l of lines) await speak(l.text, l.lang);
}

// Voices load asynchronously in Chrome.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => voices();
}
