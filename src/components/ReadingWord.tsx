"use client";
/**
 * An English word with the "reading finger": a sparkle that glides left to
 * right under the letters, guiding a right-to-left reader's eye.
 */
import { motion, useReducedMotion } from "motion/react";
import { En } from "./En";

export function ReadingWord({ text, play, size = 44 }: { text: string; play: number; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block px-2 pb-3" dir="ltr">
      <En className="font-bold text-cream" >
        <span style={{ fontSize: Math.max(28, size) }}>
          {text.split("").map((ch, i) => (
            <motion.span
              key={`${play}-${i}`}
              className="inline-block"
              initial={{ color: "#FFF4D6" }}
              animate={reduce ? {} : { color: ["#FFF4D6", "#FFC53D", "#FFF4D6"], y: [0, -4, 0] }}
              transition={{ delay: 0.15 + i * 0.16, duration: 0.4 }}
            >
              {ch === " " ? " " : ch}
            </motion.span>
          ))}
        </span>
      </En>
      {!reduce && (
        <motion.span
          key={play}
          className="absolute bottom-0 text-xl"
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: ["0%", "95%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.3 + text.length * 0.16, ease: "linear" }}
        >
          ✨
        </motion.span>
      )}
    </span>
  );
}
