"use client";

import ProgressBar from "./ProgressBar";

interface TripProgressStripProps {
  name: string;
  packed: number;
  total: number;
  onAddItem: () => void;
}

/**
 * Slim "boarding pass" strip fixed under the site header. TripView shows it
 * once the trip header card scrolls out of view, so the trip name, progress,
 * and the add-item action stay in reach on long lists.
 */
export default function TripProgressStrip({
  name,
  packed,
  total,
  onAddItem,
}: TripProgressStripProps) {
  const done = total > 0 && packed === total;

  const scrollToTop = () =>
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });

  return (
    <div className="glass animate-rise fixed inset-x-0 top-16 z-20 border-b-2 border-dashed border-base-content/15">
      <div className="mx-auto flex h-12 max-w-3xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={scrollToTop}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          title="Back to top"
        >
          <span className="font-display max-w-[38%] truncate text-sm font-semibold text-base-content">
            {name}
          </span>
          <ProgressBar packed={packed} total={total} size="sm" className="flex-1" />
          <span
            className={`shrink-0 text-xs font-semibold ${
              done ? "text-success" : "text-base-content/60"
            }`}
          >
            {done ? "All packed ✓" : `${packed}/${total}`}
          </span>
        </button>
        <button
          type="button"
          onClick={onAddItem}
          aria-label="Add item"
          className="btn btn-primary btn-sm btn-circle shrink-0 text-base leading-none"
        >
          ＋
        </button>
      </div>
    </div>
  );
}
