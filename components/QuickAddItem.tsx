"use client";

import { useState, type FormEvent } from "react";
import { addItem } from "@/lib/repo";

interface QuickAddItemProps {
  tripId: string;
  containerId: string | null;
  /** Opens the full item modal (category, quantity, …) for this container. */
  onOpenFull?: () => void;
}

/** Inline "type and Enter" item add, kept focused for rapid entry. */
export default function QuickAddItem({
  tripId,
  containerId,
  onOpenFull,
}: QuickAddItemProps) {
  const [name, setName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    await addItem(tripId, { name: trimmed, containerId });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <span className="pl-2 text-slate-300" aria-hidden>
        ＋
      </span>
      <input
        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add item…"
        aria-label="Quick add item"
      />
      {name.trim() ? (
        <button type="submit" className="btn-ghost text-teal-600">
          Add
        </button>
      ) : onOpenFull ? (
        <button
          type="button"
          onClick={onOpenFull}
          className="btn-ghost text-slate-400"
          title="Add with options"
        >
          options
        </button>
      ) : null}
    </form>
  );
}
