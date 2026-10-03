"use client";
/**
 * The story moment: new words are the magic that restores the place.
 * Each word is heard, said, then read (listen → say → read), and then it
 * flies into the scene and brings back a piece of the world.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { sayWord, sfx } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { emit } from "@/lib/events";
import { lunaSay } from "@/lib/luna";
import { logSpeech } from "@/lib/store";
import type { Quality } from "@/lib/srs";
import { MicButton, type MicOutcome } from "../MicButton";
import { Picture } from "../Picture";
import { ReadingWord } from "../ReadingWord";
import { Btn } from "../Btn";
import { SpeakerButton, wait, type GameProps } from "./shared";

type Step = "hear" | "say" | "read";

export function StoryMoment({ activity, chapter, onDone }: GameProps) {
  const words = activity.words;
  const [i, setI] = useState(0);
  const [step, setStep] = useState<Step>("hear");
  const [restored, setRestored] = useState<string[]>([]);
  const [said, setSaid] = useState<string[]>([]);
  // Recognised words earn the +1 "spoke a new word" star; self-reports don't.
  const recognized = useRef<string[]>([]);
  const [tries, setTries] = useState(0);
  const [play, setPlay] = useState(0);
  const reduce = useReducedMotion();
  const id = words[i];
  const w = id ? WORDS[id] : undefined;

  useEffect(() => {
    if (!w) return;
    let cancelled = false;
    setStep("hear");
    setTries(0);
    (async () => {
      await wait(500);
      if (i === 0) await lunaSay("בואו נלמד את מילות הקסם!");
      if (cancelled) return;
      await lunaSay(`${w.he}. באנגלית אומרים:`, w.en);
      await sayWord(w.en);
      if (!cancelled) setStep("say");
    })();
    return () => {
      cancelled = true;
    };
  }, [i, w]);

  const finishWord = async (spoke: boolean) => {
    if (!w || !id) return;
    if (spoke) setSaid((s) => [...s, id]);
    setStep("read");
    setPlay((p) => p + 1);
    await sayWord(w.en);
    await wait(700);
    // Restore a piece of the place.
    sfx("whoosh");
    setRestored((r) => [...r, id]);
    emit("answer.correct", { wordId: id });
    void lunaSay(chapter.restoreLine);
    await wait(1500);
    if (i + 1 >= words.length) {
      const all = spoke ? [...said, id] : said;
      const quality: Record<string, Quality> = Object.fromEntries(words.map((x) => [x, all.includes(x) ? 4 : 3]));
      onDone({ firstTry: all.length, total: words.length, quality, spoken: [...recognized.current] });
    } else {
      setI((n) => n + 1);
    }
  };

  const onMic = async ({ matched, recognized: rec }: MicOutcome) => {
    if (!w || !id) return;
    if (matched) {
      if (rec) {
        logSpeech(w.en, true);
        if (!recognized.current.includes(id)) recognized.current.push(id);
      }
      emit("answer.correct", { wordId: id });
      await lunaSay("מצוין!", w.en);
      void finishWord(true);
      return;
    }
    logSpeech(w.en, false);
    const n = tries + 1;
    setTries(n);
    if (n >= 3) {
      await lunaSay("איזה ניסיון יפה!", "Great try!");
      void finishWord(true);
    } else {
      await lunaSay("כמעט! עוד פעם");
      await sayWord(w.en);
    }
  };

  const progress = restored.length / Math.max(1, words.length);

  return (
    <div className="flex h-full flex-col items-center gap-3">
      {/* The scene being restored */}
      <div className="chunky relative grid h-44 w-full max-w-md place-items-center overflow-hidden bg-gradient-to-b from-[#3d3f7a] to-[#2b2d5c]">
        <motion.span
          className="text-8xl"
          animate={{ filter: `grayscale(${1 - progress}) brightness(${0.6 + progress * 0.4})`, scale: 1 + progress * 0.1 }}
          transition={{ duration: 0.8 }}
        >
          {chapter.landmark}
        </motion.span>
        {restored.map((rid, k) => {
          const a = (k / Math.max(words.length, 1)) * Math.PI * 2 - Math.PI / 2;
          return (
            <motion.span
              key={rid}
              className="absolute"
              initial={{ x: 0, y: 180, scale: 0.2, opacity: 0 }}
              animate={{ x: Math.cos(a) * 130, y: Math.sin(a) * 58, scale: 1, opacity: 1, rotate: reduce ? 0 : [0, 10, -10, 0] }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
            >
              <Picture pic={WORDS[rid].pic} size={42} />
            </motion.span>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {w && id && (
          <motion.div
            key={id}
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="chunky flex w-full max-w-sm flex-col items-center gap-2 bg-white/10 px-6 py-4"
          >
            <Picture pic={w.pic} size={96} />
            <div className="min-h-[60px]">{step === "read" ? <ReadingWord text={w.en} play={play} /> : <span className="text-3xl">👂</span>}</div>
            <span className="text-base text-cream/70">{w.he}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-28 items-center gap-4">
        {w && step !== "read" && <SpeakerButton onClick={() => void sayWord(w.en)} />}
        {w && step === "say" && (
          <>
            <MicButton target={w.en} onResult={onMic} />
            <Btn tone="ghost" className="text-base" onClick={() => void finishWord(false)}>
              הלאה
            </Btn>
          </>
        )}
      </div>
      <p className="text-base text-cream/80">
        {step === "hear" ? "הקשיבו…" : step === "say" ? "עכשיו תורכם! אמרו את המילה" : "קוראים יחד, משמאל לימין"}
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {words.map((x) => (
          <span key={x} className="text-xl">
            {restored.includes(x) ? "🌟" : "▫️"}
          </span>
        ))}
      </div>
    </div>
  );
}
