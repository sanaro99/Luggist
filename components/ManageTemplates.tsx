"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteTemplate, renameTemplate } from "@/lib/templates";
import type { Template, TemplateContainer } from "@/lib/types";
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

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
    >
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TemplatePreview({ template }: { template: Template }) {
  const { containers, items } = template.data;
  const bags = containers
    .filter((c) => c.parentTempId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const cubesOf = (bag: TemplateContainer) =>
    containers
      .filter((c) => c.parentTempId === bag.tempId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const itemsOf = (containerTempId: string | null) =>
    items
      .filter((i) => i.containerTempId === containerTempId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const unassigned = itemsOf(null);

  return (
    <div className="mt-2 space-y-1.5 pl-10 text-xs text-base-content/70">
      {bags.map((bag) => {
        const bagItems = itemsOf(bag.tempId);
        const cubes = cubesOf(bag);
        return (
          <div key={bag.tempId}>
            <div className="flex items-center gap-1 font-medium text-base-content/80">
              <span aria-hidden>🧳</span>
              {bag.name}
            </div>
            <div className="ml-3 mt-0.5 space-y-0.5">
              {bagItems.map((item, i) => (
                <div key={i} className="flex items-center gap-1 text-base-content/55">
                  <span aria-hidden className="text-[10px]">·</span>
                  {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </div>
              ))}
              {cubes.map((cube) => {
                const cubeItems = itemsOf(cube.tempId);
                return (
                  <div key={cube.tempId}>
                    <div className="flex items-center gap-1 text-base-content/70">
                      <span aria-hidden>🧦</span>
                      {cube.name}
                    </div>
                    <div className="ml-3 space-y-0.5">
                      {cubeItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-1 text-base-content/55">
                          <span aria-hidden className="text-[10px]">·</span>
                          {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {unassigned.length > 0 && (
        <div>
          <div className="flex items-center gap-1 font-medium text-base-content/80">
            <span aria-hidden>📦</span>
            Unassigned
          </div>
          <div className="ml-3 mt-0.5 space-y-0.5">
            {unassigned.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-base-content/55">
                <span aria-hidden className="text-[10px]">·</span>
                {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateRow({ template }: { template: Template }) {
  const [name, setName] = useState(template.name);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const bagCount = template.data.containers.filter((c) => c.kind === "bag").length;
  const itemCount = template.data.items.length;

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(template.name);
    else if (trimmed !== template.name) renameTemplate(template.id, trimmed);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 p-2.5">
        <span className="min-w-0 flex-1 truncate text-sm text-base-content">
          Delete &quot;{template.name}&quot;?
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
          Cancel
        </button>
        <button
          className="btn btn-error btn-sm"
          onClick={() => deleteTemplate(template.id)}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-base-300 p-2.5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-base-200 text-base" aria-hidden>
          📋
        </span>
        <input
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-base-content outline-none hover:border-base-300 focus:border-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button
          className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse preview" : "Preview template contents"}
        >
          <ChevronIcon expanded={expanded} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-error"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${template.name}`}
        >
          <TrashIcon />
        </button>
      </div>
      <p className="mt-1 pl-10 text-xs text-base-content/45">
        {bagCount} {bagCount === 1 ? "bag" : "bags"} · {itemCount}{" "}
        {itemCount === 1 ? "item" : "items"}
        {template.builtIn ? " · starter" : ""}
        {template.description ? ` · ${template.description}` : ""}
      </p>
      {expanded && <TemplatePreview template={template} />}
    </div>
  );
}

interface ManageTemplatesProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageTemplates({ open, onClose }: ManageTemplatesProps) {
  const templates = useLiveQuery(() =>
    db.templates.orderBy("createdAt").toArray(),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Templates"
      subtitle="Reusable packing lists"
    >
      <p className="mb-4 text-sm text-base-content/60">
        Start a trip from one via &quot;New trip → Start from&quot;, or save any
        trip as a template from its menu.
      </p>
      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <TemplateRow key={`${t.id}:${t.name}`} template={t} />
        ))}
        {templates && templates.length === 0 && (
          <p className="py-4 text-center text-sm text-base-content/40">
            No templates yet.
          </p>
        )}
      </div>
    </Modal>
  );
}
