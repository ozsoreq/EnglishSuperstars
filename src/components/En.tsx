/** English learning text: its own LTR element in the learning typeface. */
export function En({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" lang="en" className={`en ${className}`}>
      {children}
    </span>
  );
}
