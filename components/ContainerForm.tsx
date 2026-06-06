"use client";

import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { addContainer, updateContainer } from "@/lib/repo";
import { COLOR_PALETTE } from "@/lib/seed";
import type { Container, ContainerKind } from "@/lib/types";

interface ContainerFormProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  kind: ContainerKind;
  parentId?: string | null;
  container?: Container;
}

export default function ContainerForm(props: ContainerFormProps) {
  if (!props.open) return null;
  return <ContainerFormInner {...props} />;
}

function ContainerFormInner({
  onClose,
  tripId,
  kind,
  parentId = null,
  container,
}: ContainerFormProps) {
  const [name, setName] = useState(container?.name ?? "");
  const [color, setColor] = useState<string>(container?.color ?? COLOR_PALETTE[0]);

  const noun = kind === "bag" ? "bag" : "packing cube";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (container) {
      await updateContainer(container.id, { name: name.trim(), color });
    } else {
      await addContainer(tripId, kind, name.trim(), parentId, color);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={container ? `Edit ${noun}` : `New ${noun}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="container-name">
            Name
          </label>
          <input
            id="container-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "bag" ? "e.g. Carry-on" : "e.g. Tops cube"}
            autoFocus
          />
        </div>
        <div>
          <span className="label">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full transition ${
                  color === c
                    ? "ring-2 ring-slate-900 ring-offset-2"
                    : "ring-1 ring-black/5"
                }`}
              />
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          {container ? "Save changes" : `Add ${noun}`}
        </button>
      </form>
    </Modal>
  );
}
