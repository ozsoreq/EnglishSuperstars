"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { sfx } from "@/lib/audio";

type Props = HTMLMotionProps<"button"> & { tone?: "gold" | "mint" | "coral" | "lavender" | "cream" | "ghost"; silent?: boolean };

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  gold: "bg-gold text-night-deep",
  mint: "bg-mint text-night-deep",
  coral: "bg-coral text-night-deep",
  lavender: "bg-lavender text-night-deep",
  cream: "bg-cream text-night-deep",
  ghost: "bg-white/10 text-cream border-white/20",
};

/** Every tap answers: squash on press, spring back. Min 56px touch target. */
export function Btn({ tone = "cream", silent, className = "", onClick, ...rest }: Props) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={`chunky min-h-14 min-w-14 px-5 font-bold ${TONES[tone]} ${className}`}
      onClick={(e) => {
        if (!silent) sfx("tap");
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
