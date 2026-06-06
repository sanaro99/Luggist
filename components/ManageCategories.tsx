"use client";

import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addCategory, deleteCategory, updateCategory } from "@/lib/repo";
import { COLOR_PALETTE } from "@/lib/seed";
import type { Category } from "@/lib/types";
import Modal from "./Modal";

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m2 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoryRow({ cat }: { cat: Category }) {
  const [name, setName] = useState(cat.name);
  const [showColors, setShowColors] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(cat.name);
    } else if (trimmed !== cat.name) {
      updateCategory(cat.id, { name: trimmed });
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
          Delete “{cat.name}”?
        </span>
        <button className="btn-ghost" onClick={() => setConfirming(false)}>
          Cancel
        </button>
        <button
          className="px-2 py-1 text-sm font-medium text-red-600"
          onClick={() => deleteCategory(cat.id)}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowColors((v) => !v)}
          style={{ backgroundColor: cat.color }}
          className="h-5 w-5 shrink-0 rounded-full ring-1 ring-black/5"
          aria-label="Change color"
        />
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-1 text-sm text-slate-800 outline-none hover:border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button
          className="btn-ghost text-slate-400 hover:text-red-600"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${cat.name}`}
        >
          <TrashIcon />
        </button>
      </div>
      {showColors && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                updateCategory(cat.id, { color: c });
                setShowColors(false);
              }}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full ${
                cat.color === c
                  ? "ring-2 ring-slate-900 ring-offset-1"
                  : "ring-1 ring-black/5"
              }`}
              aria-label={`Use color ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ManageCategoriesProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageCategories({
  open,
  onClose,
}: ManageCategoriesProps) {
  const categories = useLiveQuery(() =>
    db.categories.orderBy("sortOrder").toArray(),
  );
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(COLOR_PALETTE[0]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCategory(newName, newColor);
    setNewName("");
    setNewColor(COLOR_PALETTE[0]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Categories">
      <p className="mb-4 text-sm text-slate-500">
        Categories are shared across all your trips.
      </p>

      <form onSubmit={add} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category…"
          />
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              style={{ backgroundColor: c }}
              className={`h-6 w-6 rounded-full ${
                newColor === c
                  ? "ring-2 ring-slate-900 ring-offset-1"
                  : "ring-1 ring-black/5"
              }`}
              aria-label={`Use color ${c}`}
            />
          ))}
        </div>
      </form>

      <div className="space-y-2">
        {(categories ?? []).map((cat) => (
          <CategoryRow key={`${cat.id}:${cat.name}:${cat.color}`} cat={cat} />
        ))}
        {categories && categories.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            No categories yet.
          </p>
        )}
      </div>
    </Modal>
  );
}
