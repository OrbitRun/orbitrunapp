// Tiny minimalist neon orbit spinner used for loading states.
type Props = {
  size?: number;
  className?: string;
};

export default function OrbitSpinner({ size = 20, className = "" }: Props) {
  return (
    <span
      className={`inline-block animate-spin ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="2.5"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
