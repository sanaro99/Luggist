// Stable id encoding for drag-and-drop. Item and container ids are both UUIDs,
// so we prefix them to tell what a dragged/dropped element represents.

export type DragKind = "item" | "container" | "zone";

export const itemDragId = (id: string): string => `item:${id}`;
export const containerDragId = (id: string): string => `container:${id}`;
export const zoneDropId = (containerId: string | null): string =>
  `zone:${containerId ?? "unassigned"}`;

export function parseDragId(value: string): { type: DragKind; id: string } {
  const idx = value.indexOf(":");
  return {
    type: value.slice(0, idx) as DragKind,
    id: value.slice(idx + 1),
  };
}
