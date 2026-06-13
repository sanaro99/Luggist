import { tripCountdown, type CountdownTone } from "@/lib/format";

const TONE_CLASS: Record<CountdownTone, string> = {
  soon: "bg-primary/12 text-primary",
  upcoming: "bg-base-200 text-base-content/70",
  today: "bg-accent/20 text-accent-content",
  ongoing: "bg-secondary/15 text-secondary",
  past: "bg-base-200 text-base-content/45",
};

const TONE_ICON: Record<CountdownTone, string> = {
  soon: "⏳",
  upcoming: "🗓️",
  today: "🎉",
  ongoing: "✈️",
  past: "✓",
};

interface CountdownBadgeProps {
  start?: string;
  end?: string;
  className?: string;
}

/** A friendly "in N days" pill. Renders nothing when the trip has no dates. */
export default function CountdownBadge({
  start,
  end,
  className = "",
}: CountdownBadgeProps) {
  const countdown = tripCountdown(start, end);
  if (!countdown) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[countdown.tone]} ${className}`}
    >
      <span aria-hidden>{TONE_ICON[countdown.tone]}</span>
      {countdown.label}
    </span>
  );
}
