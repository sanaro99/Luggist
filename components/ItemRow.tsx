"use client";

import { togglePacked } from "@/lib/repo";
import type { Category, Item } from "@/lib/types";
import Menu from "./Menu";

interface ItemRowProps {
  item: Item;
  category?: Category;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export default function ItemRow({
  item,
  category,
  onEdit,
  onDelete,
}: ItemRowProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
      <button
        role="checkbox"
        aria-checked={item.packed}
        aria-label={item.packed ? `Mark ${item.name} unpacked` : `Mark ${item.name} packed`}
        onClick={() => togglePacked(item.id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          item.packed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white hover:border-teal-400"
        }`}
      >
        {item.packed && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2.5 6.5 5 9l4.5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm ${
              item.packed ? "text-slate-400 line-through" : "text-slate-800"
            }`}
          >
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
              ×{item.quantity}
            </span>
          )}
        </div>
      </div>

      {category && (
        <span className="hidden items-center gap-1.5 sm:flex">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-xs text-slate-400">{category.name}</span>
        </span>
      )}

      <Menu
        ariaLabel={`Options for ${item.name}`}
        actions={[
          { label: "Edit", onClick: () => onEdit(item) },
          { label: "Delete", onClick: () => onDelete(item), danger: true },
        ]}
      />
    </div>
  );
}
