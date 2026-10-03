"use client";
/**
 * The microphone: tap, say the word, Luna's ears perk up while listening.
 * Where speech recognition isn't available (or the mic is blocked) it turns
 * into an "I said it!" button so the game never gets stuck.
 */
import { m as motion } from "framer-motion";
import { useEffect, useState } from "react";
import { sfx, stopSpeaking } from "@/lib/audio";
import { emit } from "@/lib/events";
import { canListen, listenFor, stopListening } from "@/lib/listen";
import { Emoji } from "@/components/Emoji";

export type MicOutcome = { matched: boolean; recognized: boolean };

export function MicButton({
  target,
  onResult,
  disabled,
  size = 88,
}: {
  target: string;
  onResult: (r: MicOutcome) => void;
  disabled?: boolean;
  size?: number;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setSupported(canListen());
    return () => stopListening();
  }, []);

  if (!supported) {
    return (
      <motion.button
        type="button"
        disabled={disabled}
        whileTap={{ scale: 0.88 }}
        className="chunky min-h-16 bg-mint px-6 text-xl font-bold text-night-deep disabled:opacity-50"
        onClick={() => {
          sfx("pop");
          onResult({ matched: true, recognized: false });
        }}
      >
        <Emoji e="🗣️" /> אמרתי!
      </motion.button>
    );
  }

  const go = async () => {
    if (listening || disabled) return;
    stopSpeaking();
    sfx("tap");
    setListening(true);
    emit("listen.start", {});
    const r = await listenFor(target, 6000);
    setListening(false);
    if (r.error && ["not-allowed", "service-not-allowed", "audio-capture", "network", "unsupported", "start-failed"].includes(r.error)) {
      emit("listen.end", { matched: false });
      setSupported(false);
      return;
    }
    emit("listen.end", { matched: r.matched });
    onResult({ matched: r.matched, recognized: r.matched });
  };

  return (
    <div className="relative grid place-items-center" style={{ width: size + 24, height: size + 24 }}>
      {listening && (
        <motion.span
          className="absolute rounded-full bg-mint/40"
          style={{ width: size, height: size }}
          animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      <motion.button
        type="button"
        aria-label="לחצו ואמרו את המילה"
        disabled={disabled}
        whileTap={{ scale: 0.88 }}
        animate={{ scale: listening ? 1.1 : 1 }}
        onClick={go}
        className="chunky relative grid place-items-center rounded-full bg-mint text-4xl disabled:opacity-50"
        style={{ width: size, height: size, borderRadius: "999px" }}
      >
        <Emoji e={listening ? "👂" : "🎤"} anim={listening ? "breathe" : undefined} />
      </motion.button>
    </div>
  );
}
