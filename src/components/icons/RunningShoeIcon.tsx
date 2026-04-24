import type { SVGProps } from "react";

/**
 * Side-view running shoe icon. Stroke-based to match Lucide aesthetics
 * (currentColor, 24x24 viewBox, strokeWidth 2, round caps/joins).
 */
export function RunningShoeIcon({
  size = 24,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Sole */}
      <path d="M2 17h19a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-3l-4-3-3-1H4a2 2 0 0 0-2 2z" />
      {/* Heel/ankle collar */}
      <path d="M4 9V7" />
      {/* Toe cap seam */}
      <path d="M9 9l1 3" />
      {/* Laces */}
      <path d="M12 10l1.5-1M14 12l1.5-1M16 13l1.5-1" />
      {/* Outsole tread */}
      <path d="M4 17v2M9 17v2M14 17v2M19 17v2" />
    </svg>
  );
}

export default RunningShoeIcon;
