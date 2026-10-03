"use client";
/**
 * Modern emoji art: self-hosted Fluent 3D images instead of the device's
 * emoji font, so every phone and tablet shows the same polished, glossy
 * pictures. Sized in `em` by default so surrounding font sizes still apply.
 */
import { m as motion, useReducedMotion } from "framer-motion";
import { Children, Fragment, isValidElement, cloneElement, type ReactNode } from "react";
import { emojiSrc, splitEmoji } from "@/lib/emoji";

export type EmojiAnim = "float" | "breathe" | "wiggle" | "bounce" | "spin";

const ANIMS: Record<EmojiAnim, { animate: Record<string, number[]>; duration: number }> = {
  float: { animate: { y: [0, -6, 0] }, duration: 3.2 },
  breathe: { animate: { scale: [1, 1.05, 1] }, duration: 2.8 },
  wiggle: { animate: { rotate: [0, -8, 8, -4, 0] }, duration: 2.4 },
  bounce: { animate: { y: [0, -10, 0, -4, 0] }, duration: 1.6 },
  spin: { animate: { rotate: [0, 360] }, duration: 6 },
};

export function Emoji({
  e,
  size = "1.15em",
  anim,
  delay = 0,
  className = "",
  label,
}: {
  e: string;
  size?: number | string;
  anim?: EmojiAnim;
  delay?: number;
  className?: string;
  /** Accessible name; decorative (hidden) when omitted. */
  label?: string;
}) {
  const reduce = useReducedMotion();
  const src = emojiSrc(e);
  const dim = typeof size === "number" ? `${size}px` : size;

  if (!src) {
    return (
      <span className={className} style={{ fontSize: dim, lineHeight: 1 }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        {e}
      </span>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      decoding="async"
      className="pointer-events-none block h-full w-full select-none object-contain"
    />
  );

  const style = { width: dim, height: dim, verticalAlign: "-0.22em" } as const;
  if (!anim || reduce) {
    return (
      <span className={`inline-block shrink-0 ${className}`} style={style}>
        {img}
      </span>
    );
  }
  const a = ANIMS[anim];
  return (
    <motion.span
      className={`inline-block shrink-0 ${className}`}
      style={style}
      animate={a.animate}
      transition={{ duration: a.duration, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {img}
    </motion.span>
  );
}

/** Replace emoji inside a plain string with Emoji images. */
export function EmojiText({ text }: { text: string }) {
  return (
    <>
      {splitEmoji(text).map((p, i) => (p.emoji ? <Emoji key={i} e={p.text} /> : <Fragment key={i}>{p.text}</Fragment>))}
    </>
  );
}

/** Walk React children and swap emoji in any string for Emoji images. */
export function emojify(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return <EmojiText text={child} />;
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children !== undefined && typeof child.type === "string") {
      return cloneElement(child, undefined, emojify(child.props.children));
    }
    return child;
  });
}
