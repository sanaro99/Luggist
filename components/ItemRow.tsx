"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { togglePacked } from "@/lib/repo";
import { itemDragId } from "@/lib/dnd";
import type { Category, Item } from "@/lib/types";
import Menu from "./Menu";
import GripIcon from "./GripIcon";

interface ItemRowProps {
  item: Item;
  category?: Category;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  dndDisabled?: boolean;
}

export default function ItemRow({
  item,
  category,
  onEdit,
  onDelete,
  dndDisabled,
}: ItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: itemDragId(item.id),
      data: { type: "item", containerId: item.containerId },
      disabled: dndDisabled,
    });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors hover:bg-base-200/70 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {!dndDisabled && (
        <button
          type="button"
          className="-ml-1 shrink-0 cursor-grab touch-none text-base-content/25 hover:text-base-content/50 active:cursor-grabbing"
          aria-label={`Drag ${item.name}`}
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}

      <input
        type="checkbox"
        checked={item.packed}
        onChange={() => togglePacked(item.id)}
        aria-label={
          item.packed ? `Mark ${item.name} unpacked` : `Mark ${item.name} packed`
        }
        className="checkbox checkbox-success checkbox-sm shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-sm transition-colors ${
              item.packed
                ? "text-base-content/40 line-through"
                : "text-base-content"
            }`}
          >
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="badge badge-sm shrink-0 border-0 bg-base-200 font-medium text-base-content/60">
              ×{item.quantity}
            </span>
          )}
          {item.notes && (
            <span
              className="shrink-0 cursor-default text-xs text-base-content/35"
              title={item.notes}
              aria-label={`Note: ${item.notes}`}
            >
              📝
            </span>
          )}
        </div>
      </div>

      {category && (
        <span className="hidden items-center gap-1.5 sm:flex">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-xs text-base-content/50">{category.name}</span>
        </span>
      )}

      <Menu
        ariaLabel={`Options for ${item.name}`}
        actions={[
          { label: "Edit", onClick: () => onEdit(item) },
          { label: "Delete", onClick: () => onDelete(item), danger: true },
        ]}
      />
    </div>
  );
}
