"use client";

import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { saveTripAsTemplate } from "@/lib/templates";

interface SaveAsTemplateProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

export default function SaveAsTemplate(props: SaveAsTemplateProps) {
  if (!props.open) return null;
  return <SaveAsTemplateInner {...props} />;
}

function SaveAsTemplateInner({
  onClose,
  tripId,
  tripName,
}: SaveAsTemplateProps) {
  const [name, setName] = useState(tripName);
  const [description, setDescription] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveTripAsTemplate(tripId, name, description);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Save as template">
      <p className="mb-4 text-sm text-slate-500">
        Save this trip&apos;s bags, cubes and items as a reusable list. Packed
        state isn&apos;t saved — new trips start unpacked.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="tpl-name">
            Template name
          </label>
          <input
            id="tpl-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Carry-on essentials"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="tpl-desc">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="tpl-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use this list"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          Save template
        </button>
      </form>
    </Modal>
  );
}
