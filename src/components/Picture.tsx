"use client";
/** Renders a word picture: Fluent 3D emoji art, a paint blob ("color:#hex") or counting stars ("num:n"). */
import { Emoji, type EmojiAnim } from "./Emoji";

export function Picture({
  pic,
  size = 72,
  className = "",
  anim = "breathe",
}: {
  pic: string;
  size?: number;
  className?: string;
  anim?: EmojiAnim | false;
}) {
  if (pic.startsWith("color:")) {
    const c = pic.slice(6);
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
        <defs>
          <radialGradient id={`blob-${c.slice(1)}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%" stopColor={c} stopOpacity="1" />
            <stop offset="100%" stopColor={c} stopOpacity="1" />
          </radialGradient>
        </defs>
        <path
          d="M50 6c18 0 30 10 36 24s6 32-6 44-30 22-46 16S8 72 8 54 14 22 26 13 40 6 50 6z"
          fill={`url(#blob-${c.slice(1)})`}
          stroke="#1D1F45"
          strokeOpacity="0.35"
          strokeWidth="3"
        />
        <ellipse cx="36" cy="28" rx="11" ry="6" fill="#fff" opacity="0.6" transform="rotate(-25 36 28)" />
      </svg>
    );
  }
  if (pic.startsWith("num:")) {
    const n = Number(pic.slice(4));
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const star = Math.min(size / (cols + 0.4), size / 2.1);
    return (
      <span
        className={`inline-grid place-items-center gap-0.5 ${className}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: size, minHeight: size * 0.6, direction: "ltr" }}
        aria-hidden
      >
        {Array.from({ length: n }, (_, i) => (
          <Emoji key={i} e="⭐" size={star} anim={anim ? "bounce" : undefined} delay={i * 0.12} />
        ))}
      </span>
    );
  }
  return <Emoji e={pic} size={size * 0.85} anim={anim || undefined} className={className} />;
}
