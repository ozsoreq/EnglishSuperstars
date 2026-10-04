"use client";
/**
 * The story moment: new words are the magic that restores the place.
 * Each word is heard, said, then read (listen → say → read), and then it
 * flies into the scene and brings back a piece of the world.
 */
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { sayWord, sfx } from "@/lib/audio";
import { WORDS } from "@/lib/content/words";
import { emit } from "@/lib/events";
import { L } from "@/lib/lines";
import { lunaSay } from "@/lib/luna";
import { logSpeech } from "@/lib/store";
import type { Quality } from "@/lib/srs";
import { MicButton, type MicOutcome } from "../MicButton";
import { Picture } from "../Picture";
import { ReadingWord } from "../ReadingWord";
import { SpeakerButton, wait, type GameProps } from "./shared";
import { Emoji } from "@/components/Emoji";

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
      if (i === 0) await lunaSay(L.letsLearn());
      if (cancelled) return;
      // The intro already ends with the English word — say it once.
      await lunaSay(L.wordIntro(w));
      if (!cancelled) setStep("say");
    })();
    return () => {
      cancelled = true;
    };
  }, [i, w]);

  // One finish per word, however fast the taps come.
  const finishedFor = useRef(-1);
  const finishWord = async (spoke: boolean) => {
    if (!w || !id || finishedFor.current === i) return;
    finishedFor.current = i;
    if (spoke) setSaid((s) => [...s, id]);
    setStep("read");
    setPlay((p) => p + 1);
    await sayWord(w.en);
    await wait(700);
    // Restore a piece of the place.
    sfx("whoosh");
    setRestored((r) => [...r, id]);
    emit("answer.correct", { wordId: id });
    void lunaSay(L.restore(chapter));
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
    if (!w || !id || finishedFor.current === i) return;
    if (matched) {
      if (rec) {
        logSpeech(w.en, true);
        if (!recognized.current.includes(id)) recognized.current.push(id);
      }
      emit("answer.correct", { wordId: id });
      await lunaSay(L.praise());
      void finishWord(true);
      return;
    }
    logSpeech(w.en, false);
    const n = tries + 1;
    setTries(n);
    if (n >= 3) {
      await lunaSay(L.greatTry());
      void finishWord(true);
    } else {
      await lunaSay(L.tryAgain());
    }
  };

  const progress = restored.length / Math.max(1, words.length);
  const hint = step === "hear" ? "הקשיבו למילה" : step === "say" ? "עכשיו אתם! אמרו את המילה" : "קוראים יחד";

  return (
    <div className="flex h-full flex-col items-center gap-4">
      {/* Progress: the place lights up as each word joins it. */}
      <div role="img" className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-2" aria-label={`${restored.length} מתוך ${words.length} מילים`}>
        <motion.span
          animate={{ filter: `grayscale(${1 - progress}) brightness(${0.6 + progress * 0.4})` }}
          transition={{ duration: 0.8 }}
        >
          <Emoji e={chapter.landmark} size={40} />
        </motion.span>
        <div className="flex items-center gap-2" dir="ltr">
          {words.map((x) => (
            <span key={x} className="grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-white/20">
              {restored.includes(x) && (
                <motion.span
                  initial={reduce ? false : { y: 160, scale: 2.5, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 14 }}
                >
                  <Picture pic={WORDS[x].pic} size={30} anim={false} />
                </motion.span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* The word: one big picture, its meaning, and the English once it's been heard and said. */}
      <AnimatePresence mode="wait">
        {w && id && (
          <motion.div
            key={id}
            initial={{ y: 40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="chunky flex w-full max-w-sm flex-col items-center gap-1 bg-white/10 px-6 pb-3 pt-5"
          >
            <Picture pic={w.pic} size={150} />
            <span className="text-lg text-cream/80">{w.he}</span>
            {step === "read" && <ReadingWord text={w.en} play={play} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* One thing to do at a time. */}
      <p className="text-xl font-bold text-cream">{hint}</p>
      <div className="flex min-h-28 items-center justify-center gap-4">
        {w && step === "hear" && (
          <motion.div animate={reduce ? {} : { scale: [1, 1.1, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <SpeakerButton onClick={() => void sayWord(w.en)} />
          </motion.div>
        )}
        {w && step === "say" && (
          <>
            <MicButton target={w.en} onResult={onMic} />
            <SpeakerButton onClick={() => void sayWord(w.en)} />
          </>
        )}
      </div>
      {w && step === "say" && (
        <button type="button" className="text-base text-cream/60 underline underline-offset-4" onClick={() => void finishWord(false)}>
          דלגו על המילה
        </button>
      )}
    </div>
  );
}
