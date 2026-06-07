"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteTemplate, renameTemplate } from "@/lib/templates";
import type { Template } from "@/lib/types";
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

function TemplateRow({ template }: { template: Template }) {
  const [name, setName] = useState(template.name);
  const [confirming, setConfirming] = useState(false);

  const bagCount = template.data.containers.filter((c) => c.kind === "bag").length;
  const itemCount = template.data.items.length;

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(template.name);
    else if (trimmed !== template.name) renameTemplate(template.id, trimmed);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
          Delete “{template.name}”?
        </span>
        <button className="btn-ghost" onClick={() => setConfirming(false)}>
          Cancel
        </button>
        <button
          className="px-2 py-1 text-sm font-medium text-red-600"
          onClick={() => deleteTemplate(template.id)}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent px-1.5 py-1 text-sm font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
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
          aria-label={`Delete ${template.name}`}
        >
          <TrashIcon />
        </button>
      </div>
      <p className="mt-1 pl-1.5 text-xs text-slate-400">
        {bagCount} {bagCount === 1 ? "bag" : "bags"} · {itemCount}{" "}
        {itemCount === 1 ? "item" : "items"}
        {template.builtIn ? " · starter" : ""}
        {template.description ? ` · ${template.description}` : ""}
      </p>
    </div>
  );
}

interface ManageTemplatesProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageTemplates({
  open,
  onClose,
}: ManageTemplatesProps) {
  const templates = useLiveQuery(() =>
    db.templates.orderBy("createdAt").toArray(),
  );

  return (
    <Modal open={open} onClose={onClose} title="Templates">
      <p className="mb-4 text-sm text-slate-500">
        Reusable packing lists. Start a trip from one via “New trip → Start
        from”, or save any trip as a template from its menu.
      </p>
      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <TemplateRow key={`${t.id}:${t.name}`} template={t} />
        ))}
        {templates && templates.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">
            No templates yet.
          </p>
        )}
      </div>
    </Modal>
  );
}
