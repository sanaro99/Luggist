"use client";

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
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        onClick={onClear}
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          selected.size === 0
            ? "bg-teal-600 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
            style={active ? { backgroundColor: `${cat.color}22` } : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              active
                ? "text-slate-800 ring-1 ring-inset"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
            <span className="text-xs text-slate-400">{counts.get(cat.id)}</span>
          </button>
        );
      })}
      {uncategorized > 0 && (
        <button
          onClick={() => onToggle(UNCATEGORIZED)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            selected.has(UNCATEGORIZED)
              ? "bg-slate-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Uncategorized
          <span
            className={`text-xs ${
              selected.has(UNCATEGORIZED) ? "text-slate-300" : "text-slate-400"
            }`}
          >
            {uncategorized}
          </span>
        </button>
      )}
    </div>
  );
}
