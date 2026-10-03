"use client";
/**
 * Speech recognition for speaking games. Uses the browser Web Speech API,
 * the spec's fallback path; a cloud pronunciation API would sit behind a
 * server route with the same interface. Audio never leaves the browser here
 * and nothing is stored.
 */
import { anyMatch } from "./speech-match";

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return ctor() !== null;
}

export interface ListenResult {
  heard: string[];
  matched: boolean;
  error?: string;
}

let active: RecognitionLike | null = null;

export function stopListening() {
  active?.abort();
  active = null;
}

export function listenFor(target: string, timeoutMs = 5000): Promise<ListenResult> {
  const Ctor = ctor();
  if (!Ctor) return Promise.resolve({ heard: [], matched: false, error: "unsupported" });
  stopListening();

  return new Promise((resolve) => {
    const rec = new Ctor();
    active = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;

    let settled = false;
    const heard: string[] = [];
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (active === rec) active = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      resolve({ heard, matched: anyMatch(heard, target), error });
    };
    const timer = setTimeout(() => finish("timeout"), timeoutMs);

    rec.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const alts = e.results[i];
        for (let j = 0; j < alts.length; j++) heard.push(alts[j].transcript);
      }
      finish();
    };
    rec.onerror = (e) => finish(e.error);
    rec.onend = () => finish();
    try {
      rec.start();
    } catch {
      finish("start-failed");
    }
  });
}
