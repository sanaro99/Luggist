"use client";

import { useMemo, useState, type FormEvent } from "react";
import Modal from "./Modal";
import { addItem, updateItem } from "@/lib/repo";
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
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 1);
  const [containerId, setContainerId] = useState<string>(
    item?.containerId ?? defaultContainerId ?? "",
  );
  const [categoryId, setCategoryId] = useState<string>(item?.categoryId ?? "");

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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      quantity: Math.max(1, quantity || 1),
      containerId: containerId || null,
      categoryId: categoryId || null,
    };
    if (item) {
      await updateItem(item.id, payload);
    } else {
      await addItem(tripId, payload);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={item ? "Edit item" : "Add item"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="item-name">
            Item
          </label>
          <input
            id="item-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Passport"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <div>
            <label className="label" htmlFor="item-qty">
              Qty
            </label>
            <input
              id="item-qty"
              type="number"
              min={1}
              className="input"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div>
            <label className="label" htmlFor="item-cat">
              Category
            </label>
            <select
              id="item-cat"
              className="input"
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
          <label className="label" htmlFor="item-container">
            Packed in
          </label>
          <select
            id="item-container"
            className="input"
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
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          {item ? "Save changes" : "Add item"}
        </button>
      </form>
    </Modal>
  );
}
