/** Small score bar + number, coloured by how good the score is. */
export default function ScoreCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">-</span>;

  const tone =
    value >= 85
      ? { bar: "bg-success", text: "text-success" }
      : value >= 70
        ? { bar: "bg-primary", text: "text-primary" }
        : { bar: "bg-warning", text: "text-warning" };

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className={`text-[0.8rem] font-semibold ${tone.text}`}>{value}</span>
    </div>
  );
}
