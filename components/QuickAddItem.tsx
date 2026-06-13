"use client";

import { useState, type FormEvent } from "react";
import { addItem } from "@/lib/repo";
import { getOrCreateCategoryByName } from "@/lib/templates";
import { aiParseQuickAdd, categorizeOffline } from "@/lib/ai/client";

interface QuickAddItemProps {
  tripId: string;
  containerId: string | null;
  /** Opens the full item modal (category, quantity, …) for this container. */
  onOpenFull?: () => void;
}

// Looks like more than one item — route through the natural-language parser.
const MULTI = /[,;+\n]|\sand\s|^\s*\d+\s+\S/i;

/** Inline "type and Enter" item add, kept focused for rapid entry. */
export default function QuickAddItem({
  tripId,
  containerId,
  onOpenFull,
}: QuickAddItemProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const addOne = async (
    itemName: string,
    quantity: number,
    categoryName: string | null,
  ) => {
    const categoryId = categoryName
      ? await getOrCreateCategoryByName(categoryName)
      : null;
    await addItem(tripId, { name: itemName, quantity, containerId, categoryId });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;

    // Single plain item: instant add, auto-categorized offline.
    if (!MULTI.test(trimmed)) {
      setName("");
      await addOne(trimmed, 1, categorizeOffline(trimmed));
      return;
    }

    // Multiple items: parse via AI (falls back to an offline split).
    setBusy(true);
    setName("");
    try {
      const parsed = await aiParseQuickAdd(trimmed);
      for (const p of parsed) await addOne(p.name, p.quantity, p.categoryName);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5 rounded-xl px-2 py-1 transition-colors focus-within:bg-base-200/60"
    >
      <span className="text-base text-base-content/30" aria-hidden>
        ＋
      </span>
      <input
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-base-content outline-none placeholder:text-base-content/40"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={busy ? "Adding…" : "Add item, or a list…"}
        aria-label="Quick add item"
        disabled={busy}
      />
      {busy ? (
        <span className="loading loading-spinner loading-xs text-base-content/40" />
      ) : name.trim() ? (
        <button type="submit" className="btn btn-primary btn-xs rounded-full">
          Add
        </button>
      ) : onOpenFull ? (
        <button
          type="button"
          onClick={onOpenFull}
          className="btn btn-ghost btn-xs rounded-full text-base-content/50"
          title="Add with options"
        >
          options
        </button>
      ) : null}
    </form>
  );
}
