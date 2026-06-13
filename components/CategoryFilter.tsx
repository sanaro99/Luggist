"use client";

import type { CSSProperties } from "react";
import type { Category } from "@/lib/types";

export const UNCATEGORIZED = "__uncategorized__";

interface CategoryFilterProps {
  categories: Category[];
  counts: Map<string, number>; // keyed by category id or UNCATEGORIZED
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}

export default function CategoryFilter({
  categories,
  counts,
  selected,
  onToggle,
  onClear,
}: CategoryFilterProps) {
  const uncategorized = counts.get(UNCATEGORIZED) ?? 0;
  const visible = categories.filter((c) => (counts.get(c.id) ?? 0) > 0);

  if (visible.length === 0 && uncategorized === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      <button
        onClick={onClear}
        className={`badge badge-lg shrink-0 cursor-pointer gap-1 border-0 font-medium transition-colors ${
          selected.size === 0
            ? "bg-primary text-primary-content"
            : "bg-base-200 text-base-content/70 hover:bg-base-300"
        }`}
      >
        All
      </button>
      {visible.map((cat) => {
        const active = selected.has(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            style={
              active
                ? ({
                    backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)`,
                    boxShadow: `inset 0 0 0 1.5px ${cat.color}`,
                  } as CSSProperties)
                : undefined
            }
            className={`badge badge-lg shrink-0 cursor-pointer gap-1.5 border-0 font-medium transition-colors ${
              active
                ? "text-base-content"
                : "bg-base-200 text-base-content/70 hover:bg-base-300"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
            <span className="opacity-60">{counts.get(cat.id)}</span>
          </button>
        );
      })}
      {uncategorized > 0 && (
        <button
          onClick={() => onToggle(UNCATEGORIZED)}
          className={`badge badge-lg shrink-0 cursor-pointer gap-1.5 border-0 font-medium transition-colors ${
            selected.has(UNCATEGORIZED)
              ? "bg-neutral text-neutral-content"
              : "bg-base-200 text-base-content/70 hover:bg-base-300"
          }`}
        >
          Uncategorized
          <span className="opacity-60">{uncategorized}</span>
        </button>
      )}
    </div>
  );
}
