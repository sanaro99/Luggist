"use client";

import type { Category } from "@/lib/types";
import type { ItemSort } from "@/lib/progress";
import CategoryFilter from "./CategoryFilter";

interface FilterPanelProps {
  open: boolean;
  categories: Category[];
  counts: Map<string, number>;
  selected: Set<string>;
  onToggleCategory: (id: string) => void;
  onClearCategories: () => void;
  unpackedOnly: boolean;
  onUnpackedOnlyChange: (value: boolean) => void;
  sortMode: ItemSort;
  onSortModeChange: (value: ItemSort) => void;
  onReset: () => void;
  activeCount: number;
}

/**
 * The trip screen's filter and sort controls, tucked behind the toolbar's
 * Filters button so the item list stays near the top of the screen on mobile.
 */
export default function FilterPanel({
  open,
  categories,
  counts,
  selected,
  onToggleCategory,
  onClearCategories,
  unpackedOnly,
  onUnpackedOnlyChange,
  sortMode,
  onSortModeChange,
  onReset,
  activeCount,
}: FilterPanelProps) {
  if (!open) return null;

  return (
    <div
      id="trip-filters"
      className="animate-rise mt-3 rounded-3xl border border-base-300/70 bg-base-100/80 p-3 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/70">
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={unpackedOnly}
            onChange={(e) => onUnpackedOnlyChange(e.target.checked)}
          />
          Unpacked only
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm text-base-content/70">
          <span>Sort</span>
          <select
            className="select select-bordered select-sm rounded-full"
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as ItemSort)}
            aria-label="Sort items"
          >
            <option value="manual">Manual</option>
            <option value="az">A – Z</option>
            <option value="packed">Packed last</option>
          </select>
        </label>
      </div>

      {categories.length > 0 && (
        <div className="mt-3">
          <CategoryFilter
            categories={categories}
            counts={counts}
            selected={selected}
            onToggle={onToggleCategory}
            onClear={onClearCategories}
          />
        </div>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
