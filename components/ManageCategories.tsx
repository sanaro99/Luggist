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
      <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-2">
        <span className="min-w-0 flex-1 truncate text-sm text-base-content">
          Delete “{cat.name}”?
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Cancel
        </button>
        <button
          className="btn btn-error btn-sm"
          onClick={() => deleteCategory(cat.id)}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-base-300 p-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowColors((v) => !v)}
          style={{ backgroundColor: cat.color }}
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/5 transition hover:scale-110"
          aria-label="Change color"
        />
        <input
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-base-content outline-none hover:border-base-300 focus:border-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button
          className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-error"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${cat.name}`}
        >
          <TrashIcon />
        </button>
      </div>
      {showColors && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
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
                  ? "ring-2 ring-base-content ring-offset-1 ring-offset-base-100"
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

export default function ManageCategories({ open, onClose }: ManageCategoriesProps) {
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
    <Modal
      open={open}
      onClose={onClose}
      title="Categories"
      subtitle="Shared across all your trips"
    >
      <form onSubmit={add} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            className="input input-bordered w-full"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category…"
          />
          <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
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
                  ? "ring-2 ring-base-content ring-offset-1 ring-offset-base-100"
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
          <p className="py-4 text-center text-sm text-base-content/40">
            No categories yet.
          </p>
        )}
      </div>
    </Modal>
  );
}
