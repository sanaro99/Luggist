"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flattenItems, progressOf, weightOf, type ContainerNode } from "@/lib/progress";
import { formatKg } from "@/lib/format";
import { setPackedForItems } from "@/lib/repo";
import { containerDragId, itemDragId, zoneDropId } from "@/lib/dnd";
import type { Category, Container, Item } from "@/lib/types";
import ProgressBar from "./ProgressBar";
import ItemRow from "./ItemRow";
import Menu, { type MenuAction } from "./Menu";
import QuickAddItem from "./QuickAddItem";
import GripIcon from "./GripIcon";

interface ContainerSectionProps {
  node: ContainerNode;
  categoriesById: Map<string, Category>;
  filtering: boolean;
  dndDisabled: boolean;
  depth?: number;
  onAddItem: (containerId: string) => void;
  onAddCube: (bagId: string) => void;
  onEditContainer: (container: Container) => void;
  onDeleteContainer: (container: Container) => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 text-base-content/40 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ContainerSection({
  node,
  categoriesById,
  filtering,
  dndDisabled,
  depth = 0,
  onAddItem,
  onAddCube,
  onEditContainer,
  onDeleteContainer,
  onEditItem,
  onDeleteItem,
}: ContainerSectionProps) {
  const [open, setOpen] = useState(true);
  const { container } = node;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: containerDragId(container.id),
      data: { type: "container", parentId: container.parentId },
      disabled: dndDisabled,
    });
  const { setNodeRef: setZoneRef, isOver } = useDroppable({
    id: zoneDropId(container.id),
    data: { type: "zone", containerId: container.id },
  });

  const all = flattenItems(node);
  const progress = progressOf(all);
  const isBag = container.kind === "bag";
  const weight = weightOf(all);
  const weightLimit = container.weightLimit;
  const overLimit = weightLimit != null && weight > weightLimit;
  const showWeight = isBag && (weight > 0 || weightLimit != null);

  const itemIds = all.map((i) => i.id);
  const bulkActions: MenuAction[] = [];
  if (progress.total > 0 && progress.packed < progress.total) {
    bulkActions.push({
      label: "Mark all packed",
      onClick: () => setPackedForItems(itemIds, true),
    });
  }
  if (progress.packed > 0) {
    bulkActions.push({
      label: "Mark all unpacked",
      onClick: () => setPackedForItems(itemIds, false),
    });
  }

  const menuActions: MenuAction[] = isBag
    ? [
        ...bulkActions,
        { label: "Add packing cube", onClick: () => onAddCube(container.id) },
        { label: "Edit bag", onClick: () => onEditContainer(container) },
        { label: "Delete bag", onClick: () => onDeleteContainer(container), danger: true },
      ]
    : [
        ...bulkActions,
        { label: "Edit cube", onClick: () => onEditContainer(container) },
        { label: "Delete cube", onClick: () => onDeleteContainer(container), danger: true },
      ];

  const style = { transform: CSS.Transform.toString(transform), transition };
  const accent = container.color;

  const shell = isBag
    ? `card border bg-base-100/90 p-4 shadow-sm backdrop-blur transition-colors ${
        progress.done ? "border-success/40" : "border-base-300/70"
      }`
    : `rounded-2xl border border-base-300/60 bg-base-200/50 p-3`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${shell} ${isDragging ? "opacity-60 shadow-lg" : ""} ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        {!dndDisabled && (
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none text-base-content/25 hover:text-base-content/50 active:cursor-grabbing"
            aria-label={`Drag ${container.name}`}
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
        >
          <Chevron open={open} />
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-sm"
            style={{
              backgroundColor: accent
                ? `color-mix(in oklch, ${accent} 24%, transparent)`
                : "var(--color-base-200)",
            }}
            aria-hidden
          >
            {isBag ? "🧳" : "🧦"}
          </span>
          <span
            className={`truncate font-medium ${isBag ? "font-display text-base text-base-content" : "text-sm text-base-content/80"}`}
          >
            {container.name}
          </span>
          {!isBag && (
            <span className="badge badge-xs shrink-0 border-0 bg-base-300 text-base-content/50">
              cube
            </span>
          )}
        </button>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            progress.done
              ? "bg-success/15 text-success"
              : "bg-base-200 text-base-content/55"
          }`}
        >
          {progress.done ? "Packed ✓" : `${progress.packed}/${progress.total}`}
        </span>
        <Menu actions={menuActions} ariaLabel={`Options for ${container.name}`} />
      </div>

      {progress.total > 0 && (
        <ProgressBar
          packed={progress.packed}
          total={progress.total}
          size="sm"
          className="mt-2.5"
        />
      )}

      {showWeight && (
        <p
          className={`mt-1.5 text-xs ${
            overLimit ? "font-medium text-error" : "text-base-content/45"
          }`}
        >
          {overLimit && "⚠️ "}
          {weightLimit != null
            ? `${formatKg(weight)} / ${formatKg(weightLimit)}${
                overLimit ? " — over limit" : ""
              }`
            : `${formatKg(weight)} total`}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-1">
          <SortableContext
            items={node.children.map((c) => containerDragId(c.container.id))}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map((child) => (
              <ContainerSection
                key={child.container.id}
                node={child}
                categoriesById={categoriesById}
                filtering={filtering}
                dndDisabled={dndDisabled}
                depth={depth + 1}
                onAddItem={onAddItem}
                onAddCube={onAddCube}
                onEditContainer={onEditContainer}
                onDeleteContainer={onDeleteContainer}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
          </SortableContext>

          <div ref={setZoneRef} className="min-h-[6px] space-y-1">
            <SortableContext
              items={node.items.map((i) => itemDragId(i.id))}
              strategy={verticalListSortingStrategy}
            >
              {node.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  category={
                    item.categoryId ? categoriesById.get(item.categoryId) : undefined
                  }
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  dndDisabled={dndDisabled}
                />
              ))}
            </SortableContext>
            {progress.total === 0 && !filtering && (
              <p className="px-2 py-1 text-xs text-base-content/40">
                Empty — add an item or drag one here.
              </p>
            )}
          </div>

          {!filtering && (
            <div className="space-y-1 pt-1">
              <QuickAddItem
                tripId={container.tripId}
                containerId={container.id}
                onOpenFull={() => onAddItem(container.id)}
              />
              {isBag && (
                <button
                  className="btn btn-ghost btn-sm rounded-full text-base-content/55"
                  onClick={() => onAddCube(container.id)}
                >
                  ＋ Add cube
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
