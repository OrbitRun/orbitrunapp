type Props = {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
};

export default function StatTile({ label, value, unit, accent }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`font-display font-black tabular text-3xl leading-none ${accent ? "text-neon" : "text-foreground"}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}
