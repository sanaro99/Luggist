"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { flattenItems, progressOf, type ContainerNode } from "@/lib/progress";
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
      className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
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
  const { setNodeRef: setZoneRef } = useDroppable({
    id: zoneDropId(container.id),
    data: { type: "zone", containerId: container.id },
  });

  const all = flattenItems(node);
  const progress = progressOf(all);
  const isBag = container.kind === "bag";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${
        isBag ? "card p-4" : "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        {!dndDisabled && (
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
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
          {container.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: container.color }}
            />
          )}
          <span
            className={`truncate font-medium ${isBag ? "text-slate-900" : "text-slate-700"}`}
          >
            {container.name}
          </span>
          {!isBag && <span className="shrink-0 text-xs text-slate-400">cube</span>}
        </button>
        <span
          className={`shrink-0 text-xs font-medium ${
            progress.done ? "text-emerald-600" : "text-slate-500"
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

          <div ref={setZoneRef} className="min-h-[4px] space-y-1">
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
          </div>

          {!filtering && (
            <div className="space-y-1 pt-1">
              <QuickAddItem
                tripId={container.tripId}
                containerId={container.id}
                onOpenFull={() => onAddItem(container.id)}
              />
              {isBag && (
                <button className="btn-ghost" onClick={() => onAddCube(container.id)}>
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
