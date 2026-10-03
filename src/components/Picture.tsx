/** Renders a word picture: emoji, paint blob ("color:#hex") or counting stars ("num:n"). */
export function Picture({ pic, size = 72, className = "" }: { pic: string; size?: number; className?: string }) {
  if (pic.startsWith("color:")) {
    const c = pic.slice(6);
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
        <path
          d="M50 6c18 0 30 10 36 24s6 32-6 44-30 22-46 16S8 72 8 54 14 22 26 13 40 6 50 6z"
          fill={c}
          stroke="#1D1F45"
          strokeWidth="5"
        />
        <ellipse cx="36" cy="30" rx="10" ry="6" fill="#fff" opacity="0.45" transform="rotate(-25 36 30)" />
      </svg>
    );
  }
  if (pic.startsWith("num:")) {
    const n = Number(pic.slice(4));
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    return (
      <span
        className={`inline-grid place-items-center gap-0.5 ${className}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: size, minHeight: size * 0.6, direction: "ltr" }}
        aria-hidden
      >
        {Array.from({ length: n }, (_, i) => (
          <span key={i} style={{ fontSize: Math.min(size / (cols + 0.6), size / 2.2), lineHeight: 1 }}>
            ⭐
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className={className} style={{ fontSize: size * 0.8, lineHeight: 1 }} aria-hidden>
      {pic}
    </span>
  );
}
