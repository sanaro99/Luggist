"use client";

import { useState, type FormEvent } from "react";
import Modal from "./Modal";
import { useToast } from "./Toaster";
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
  const { toast } = useToast();
  const [name, setName] = useState(container?.name ?? "");
  const [color, setColor] = useState<string>(container?.color ?? COLOR_PALETTE[0]);
  const [weightLimit, setWeightLimit] = useState(
    container?.weightLimit != null ? String(container.weightLimit) : "",
  );

  const noun = kind === "bag" ? "bag" : "packing cube";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const limitNum = parseFloat(weightLimit);
    const limit =
      kind === "bag" && Number.isFinite(limitNum) && limitNum > 0
        ? limitNum
        : undefined;
    if (container) {
      await updateContainer(container.id, {
        name: name.trim(),
        color,
        weightLimit: limit,
      });
      toast(`${noun[0].toUpperCase()}${noun.slice(1)} updated`);
    } else {
      await addContainer(tripId, kind, name.trim(), parentId, color, limit);
      toast(`Added “${name.trim()}”`, { icon: kind === "bag" ? "🧳" : "🧦" });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={container ? `Edit ${noun}` : `New ${noun}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="container-name">
            Name
          </label>
          <input
            id="container-name"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "bag" ? "e.g. Carry-on" : "e.g. Tops cube"}
            autoFocus
          />
        </div>
        <div>
          <span className="form-label">Color</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-8 w-8 rounded-full transition ${
                  color === c
                    ? "ring-2 ring-base-content ring-offset-2 ring-offset-base-100"
                    : "ring-1 ring-black/5 hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
        {kind === "bag" && (
          <div>
            <label className="form-label" htmlFor="bag-weight-limit">
              Weight limit{" "}
              <span className="font-normal text-base-content/40">
                (kg, optional)
              </span>
            </label>
            <input
              id="bag-weight-limit"
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              className="input input-bordered w-full"
              value={weightLimit}
              onChange={(e) => setWeightLimit(e.target.value)}
              placeholder="e.g. 23"
            />
            <p className="mt-1 text-xs text-base-content/40">
              We&apos;ll warn you when the bag&apos;s packed weight goes over.
            </p>
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!name.trim()}
        >
          {container ? "Save changes" : `Add ${noun}`}
        </button>
      </form>
    </Modal>
  );
}
