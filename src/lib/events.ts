/**
 * Typed game event bus. Games emit what happened; Luna, the star jar, sound
 * and celebrations subscribe and react, so reactions can change without
 * touching game code.
 */

export type LunaMood = "idle" | "listening" | "happy" | "thinking" | "hint" | "celebrate";

export interface GameEvents {
  "answer.correct": { wordId?: string; x?: number; y?: number };
  "answer.wrong": { wordId?: string; attempt: number };
  "star.earned": { amount: number; x?: number; y?: number };
  "streak.up": { count: number };
  "level.up": { level: number };
  "luna.say": { he?: string; en?: string };
  "luna.mood": { mood: LunaMood };
  "listen.start": Record<string, never>;
  "listen.end": { matched: boolean };
  celebrate: { size: 1 | 2 | 3 };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

const handlers = new Map<keyof GameEvents, Set<(payload: never) => void>>();

export function on<K extends keyof GameEvents>(event: K, fn: Handler<K>): () => void {
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

export function emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
  handlers.get(event)?.forEach((fn) => (fn as Handler<K>)(payload));
}
