"use client";

import { useMemo, useState, type FormEvent } from "react";
import Modal from "./Modal";
import { useToast } from "./Toaster";
import { addItem, updateItem } from "@/lib/repo";
import { categorizeOffline } from "@/lib/ai/client";
import type { Category, Container, Item } from "@/lib/types";

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  containers: Container[];
  categories: Category[];
  item?: Item;
  defaultContainerId?: string | null;
}

export default function ItemForm(props: ItemFormProps) {
  // Mount fresh each time it opens so state initializes from the current props.
  if (!props.open) return null;
  return <ItemFormInner {...props} />;
}

function ItemFormInner({
  onClose,
  tripId,
  containers,
  categories,
  item,
  defaultContainerId = null,
}: ItemFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [containerId, setContainerId] = useState<string>(
    item?.containerId ?? defaultContainerId ?? "",
  );
  const [categoryId, setCategoryId] = useState<string>(item?.categoryId ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [weight, setWeight] = useState(
    item?.weight != null ? String(item.weight) : "",
  );

  // Flat container options with cubes indented under their bag.
  const containerOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [
      { id: "", label: "Unassigned" },
    ];
    const bags = containers
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    for (const bag of bags) {
      opts.push({ id: bag.id, label: bag.name });
      containers
        .filter((c) => c.parentId === bag.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach((cube) => opts.push({ id: cube.id, label: `  ↳ ${cube.name}` }));
    }
    return opts;
  }, [containers]);

  // Offer a category guess once the user names the item — never overrides a
  // category they've already chosen. Runs on blur (not an effect) by design.
  const suggestCategory = () => {
    if (categoryId || !name.trim()) return;
    const guess = categorizeOffline(name);
    if (!guess) return;
    const match = categories.find(
      (c) => c.name.toLowerCase() === guess.toLowerCase(),
    );
    if (match) setCategoryId(match.id);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const weightNum = parseFloat(weight);
    const payload = {
      name: name.trim(),
      quantity: Math.max(1, quantity || 1),
      containerId: containerId || null,
      categoryId: categoryId || null,
      notes: notes.trim() || undefined,
      weight: Number.isFinite(weightNum) && weightNum > 0 ? weightNum : undefined,
    };
    if (item) {
      await updateItem(item.id, payload);
      toast("Item updated");
    } else {
      await addItem(tripId, payload);
      toast(`Added “${payload.name}”`);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={item ? "Edit item" : "Add item"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="item-name">
            Item
          </label>
          <input
            id="item-name"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={suggestCategory}
            placeholder="e.g. Passport"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-[auto_1fr] items-end gap-3">
          <div>
            <span className="form-label">Qty</span>
            <div className="join">
              <button
                type="button"
                className="btn join-item"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                className="input input-bordered join-item w-14 text-center"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                aria-label="Quantity"
              />
              <button
                type="button"
                className="btn join-item"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="item-cat">
              Category
            </label>
            <select
              id="item-cat"
              className="select select-bordered w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No category</option>
              {categories
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor="item-weight">
            Weight{" "}
            <span className="font-normal text-base-content/40">(kg, optional)</span>
          </label>
          <input
            id="item-weight"
            type="number"
            min={0}
            step="0.1"
            inputMode="decimal"
            className="input input-bordered w-full"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 0.5"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="item-container">
            Packed in
          </label>
          <select
            id="item-container"
            className="select select-bordered w-full"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
          >
            {containerOptions.map((o) => (
              <option key={o.id || "none"} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="item-notes">
            Notes{" "}
            <span className="font-normal text-base-content/40">(optional)</span>
          </label>
          <textarea
            id="item-notes"
            className="textarea textarea-bordered min-h-[60px] w-full resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. travel size, buy at airport"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!name.trim()}
        >
          {item ? "Save changes" : "Add item"}
        </button>
      </form>
    </Modal>
  );
}
