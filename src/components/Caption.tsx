"use client";
/** In-flow caption for everything Luna says (every spoken prompt is also written). */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/events";
import { En } from "./En";
import { Emoji } from "@/components/Emoji";

export function Caption({ className = "" }: { className?: string }) {
  const [caption, setCaption] = useState<{ he?: string; en?: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const off = on("luna.say", (c) => {
      clearTimeout(timer.current);
      setCaption(c);
      const len = (c.he?.length ?? 0) + (c.en?.length ?? 0);
      timer.current = setTimeout(() => setCaption(null), 3500 + len * 70);
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={`flex min-h-[64px] items-center justify-center ${className}`} aria-live="polite">
      <AnimatePresence mode="wait">
        {caption && (
          <motion.div
            key={(caption.he ?? "") + (caption.en ?? "")}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className="flex max-w-xl items-center gap-2 rounded-3xl border-[3px] border-night-deep bg-cream px-4 py-2 text-night-deep"
          >
            <span className="text-2xl" aria-hidden>
              <Emoji e="🦊" />
            </span>
            <span>
              {caption.he && <span className="block font-medium leading-snug">{caption.he}</span>}
              {caption.en && (
                <span className="block text-lg font-bold text-[#5b4bc4]">
                  <En>{caption.en}</En>
                </span>
              )}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
