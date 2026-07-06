"use client";

import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { useToast } from "./Toaster";
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

function SaveAsTemplateInner({ onClose, tripId, tripName }: SaveAsTemplateProps) {
  const { toast } = useToast();
  const [name, setName] = useState(tripName);
  const [description, setDescription] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveTripAsTemplate(tripId, name, description);
    toast("Saved as template", { icon: "📋" });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Save as template"
      subtitle="Reuse this list for future trips"
    >
      <p className="mb-4 text-sm text-base-content/60">
        Save this trip&apos;s bags, cubes and items as a reusable list. Packed
        state isn&apos;t saved — new trips start unpacked.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="tpl-name">
            Template name
          </label>
          <input
            id="tpl-name"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Carry-on essentials"
            autoFocus
          />
        </div>
        <div>
          <label className="form-label" htmlFor="tpl-desc">
            Description{" "}
            <span className="font-normal text-base-content/40">(optional)</span>
          </label>
          <input
            id="tpl-desc"
            className="input input-bordered w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When to use this list"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!name.trim()}
        >
          Save template
        </button>
      </form>
    </Modal>
  );
}
