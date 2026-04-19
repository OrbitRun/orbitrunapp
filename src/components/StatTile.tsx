type Props = {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  glow?: boolean;
  size?: "md" | "lg";
};

export default function StatTile({ label, value, unit, accent, glow, size = "md" }: Props) {
  const valueSize = size === "lg" ? "text-5xl" : "text-xl";
  return (
    <div
      className={`glass rounded-2xl p-4 transition ${
        glow ? "ring-1 ring-[var(--neon)]/40 shadow-[0_0_24px_oklch(0.92_0.21_130/0.18)]" : ""
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`font-display font-black tabular ${valueSize} leading-none ${
            accent || glow ? "text-neon" : "text-foreground"
          } ${glow ? "glow-neon" : ""}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground font-bold">{unit}</span>
        )}
      </div>
    </div>
  );
}
