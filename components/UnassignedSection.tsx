"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { progressOf } from "@/lib/progress";
import { itemDragId, zoneDropId } from "@/lib/dnd";
import type { Category, Item } from "@/lib/types";
import ProgressBar from "./ProgressBar";
import ItemRow from "./ItemRow";
import QuickAddItem from "./QuickAddItem";

interface UnassignedSectionProps {
  tripId: string;
  items: Item[];
  categoriesById: Map<string, Category>;
  filtering: boolean;
  dndDisabled: boolean;
  onEditItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
  onAddFull: () => void;
}

/** Loose items not assigned to any bag/cube. Also a drop target for DnD. */
export default function UnassignedSection({
  tripId,
  items,
  categoriesById,
  filtering,
  dndDisabled,
  onEditItem,
  onDeleteItem,
  onAddFull,
}: UnassignedSectionProps) {
  const { setNodeRef } = useDroppable({
    id: zoneDropId(null),
    data: { type: "zone", containerId: null },
  });
  const progress = progressOf(items);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-medium text-slate-700">Unassigned</span>
        <span
          className={`text-xs font-medium ${
            progress.done ? "text-emerald-600" : "text-slate-500"
          }`}
        >
          {progress.done ? "Packed ✓" : `${progress.packed}/${progress.total}`}
        </span>
      </div>
      {progress.total > 0 && (
        <ProgressBar
          packed={progress.packed}
          total={progress.total}
          size="sm"
          className="mt-2.5"
        />
      )}
      <div ref={setNodeRef} className="mt-3 min-h-[4px] space-y-1">
        <SortableContext
          items={items.map((i) => itemDragId(i.id))}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
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
        {!filtering && (
          <QuickAddItem
            tripId={tripId}
            containerId={null}
            onOpenFull={onAddFull}
          />
        )}
      </div>
    </div>
  );
}
