const KNOWN = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

/** CEFR level chip. Colours come from CSS variables so dark mode stays readable. */
export default function CefrBadge({ level, className = "" }: { level: string; className?: string }) {
  const key = KNOWN.has(level) ? `var(--cefr-${level.toLowerCase()})` : "var(--muted-foreground)";
  return (
    <span
      className={`inline-block rounded-lg px-2.5 py-1 text-[0.7rem] font-bold ${className}`}
      style={{ color: key, background: `color-mix(in srgb, ${key} 15%, transparent)` }}
    >
      {level}
    </span>
  );
}
