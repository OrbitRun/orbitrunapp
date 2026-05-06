import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  text: string;
  label?: string;
  className?: string;
};

/**
 * Small "i" icon that opens a popover with explanatory text on tap or hover.
 * Designed to sit inline next to a label without disturbing the layout.
 */
export default function InfoHint({ text, label, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? "Info"}
          onClick={(e) => e.stopPropagation()}
          className={
            "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition active:scale-90 " +
            (className ?? "")
          }
        >
          <Info className="h-3 w-3" strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-60 rounded-xl border-white/10 bg-background/95 backdrop-blur p-3 text-[11px] leading-snug text-foreground shadow-xl"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
