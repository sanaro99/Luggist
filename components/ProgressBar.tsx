interface ProgressBarProps {
  packed: number;
  total: number;
  size?: "sm" | "md";
  className?: string;
}

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
      className={`w-full ${h} overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${h} rounded-full transition-all duration-300 ${
          done ? "bg-emerald-500" : "bg-teal-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
