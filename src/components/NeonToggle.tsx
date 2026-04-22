import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * NeonToggle — accessible, perfectly contained switch with the
 * Black / Neon-Green glassmorphism aesthetic. Thumb stays inside its track
 * at every state thanks to flex alignment instead of absolute positioning.
 */
export default function NeonToggle({ checked, onChange, ariaLabel, size = "md", className }: Props) {
  const trackSizes =
    size === "sm" ? "h-5 w-9 p-0.5" : "h-6 w-11 p-0.5";
  const thumbSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "shrink-0 inline-flex items-center rounded-full border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-neon/60",
        trackSizes,
        checked
          ? "bg-neon/90 border-neon shadow-neon justify-end"
          : "bg-white/10 border-white/15 justify-start",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full bg-background shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform duration-200",
          thumbSize,
        )}
      />
    </button>
  );
}
