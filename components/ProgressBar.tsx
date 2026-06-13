import type { CSSProperties } from "react";

interface ProgressBarProps {
  packed: number;
  total: number;
  size?: "sm" | "md";
  className?: string;
}

/** Slim gradient progress bar. Turns solid success-green when complete. */
export default function ProgressBar({
  packed,
  total,
  size = "md",
  className = "",
}: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  const done = total > 0 && packed === total;
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div
      className={`w-full ${h} overflow-hidden rounded-full bg-base-300 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${h} rounded-full transition-[width] duration-500 ease-out ${
          done ? "bg-success" : "bg-sunset"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface ProgressRingProps {
  packed: number;
  total: number;
  size?: string; // CSS length, e.g. "3.5rem"
  thickness?: string;
  className?: string;
}

/** Circular percentage ring built on DaisyUI's radial-progress. */
export function ProgressRing({
  packed,
  total,
  size = "3.5rem",
  thickness = "0.35rem",
  className = "",
}: ProgressRingProps) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  const done = total > 0 && packed === total;
  const empty = total === 0;
  return (
    <div
      className={`radial-progress font-display text-sm font-semibold transition-colors ${
        empty ? "text-base-content/30" : done ? "text-success" : "text-primary"
      } ${className}`}
      style={
        {
          "--value": pct,
          "--size": size,
          "--thickness": thickness,
        } as CSSProperties
      }
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {done ? "✓" : empty ? "–" : `${pct}%`}
    </div>
  );
}
