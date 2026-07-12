import { db } from "./db";
import type { Container, ContainerKind, Item, Trip } from "./types";

const uid = (): string => crypto.randomUUID();
const now = (): number => Date.now();

/* ------------------------------- Trips -------------------------------- */

export interface TripInput {
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export async function createTrip(input: TripInput): Promise<string> {
  const id = uid();
  const ts = now();
  await db.trips.add({
    id,
    name: input.name.trim(),
    destination: input.destination?.trim() || undefined,
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateTrip(
  id: string,
  patch: Partial<Omit<Trip, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  await db.trips.update(id, { ...patch, updatedAt: now() });
}

/** Deletes a trip along with all of its containers and items. */
export async function deleteTrip(id: string): Promise<void> {
  await db.transaction("rw", db.trips, db.containers, db.items, async () => {
    await db.items.where("tripId").equals(id).delete();
    await db.containers.where("tripId").equals(id).delete();
    await db.trips.delete(id);
  });
}

/* ----------------------------- Containers ----------------------------- */

export async function addContainer(
  tripId: string,
  kind: ContainerKind,
  name: string,
  parentId: string | null = null,
  color?: string,
  weightLimit?: number,
): Promise<string> {
  const id = uid();
  await db.containers.add({
    id,
    tripId,
    parentId,
    kind,
    name: name.trim(),
    color,
    weightLimit,
    sortOrder: now(),
    createdAt: now(),
  });
  return id;
}

export function addBag(
  tripId: string,
  name: string,
  color?: string,
  weightLimit?: number,
) {
  return addContainer(tripId, "bag", name, null, color, weightLimit);
}

export function addCube(
  tripId: string,
  parentBagId: string,
  name: string,
  color?: string,
) {
  return addContainer(tripId, "cube", name, parentBagId, color);
}

export async function updateContainer(
  id: string,
  patch: Partial<Omit<Container, "id" | "tripId" | "createdAt">>,
): Promise<void> {
  await db.containers.update(id, patch);
}

/**
 * Deletes a container. Any child cubes are deleted too, and every item that
 * lived in the container (or its cubes) is moved back to "unassigned" so the
 * inventory is never silently lost.
 */
export async function deleteContainer(id: string): Promise<void> {
  const container = await db.containers.get(id);
  if (!container) return;
  const { tripId } = container;
  await db.transaction("rw", db.containers, db.items, async () => {
    const siblings = await db.containers.where("tripId").equals(tripId).toArray();
    const ids = [id, ...siblings.filter((c) => c.parentId === id).map((c) => c.id)];
    const tripItems = await db.items.where("tripId").equals(tripId).toArray();
    const affected = tripItems
      .filter((it) => it.containerId !== null && ids.includes(it.containerId))
      .map((it) => it.id);
    if (affected.length > 0) {
      await db.items
        .where("id")
        .anyOf(affected)
        .modify({ containerId: null, updatedAt: now() });
    }
    await db.containers.bulkDelete(ids);
  });
}

/* ------------------------------- Items -------------------------------- */

export interface ItemInput {
  name: string;
  containerId?: string | null;
  categoryId?: string | null;
  quantity?: number;
  notes?: string;
  weight?: number;
}

export async function addItem(tripId: string, input: ItemInput): Promise<string> {
  const id = uid();
  const ts = now();
  await db.items.add({
    id,
    tripId,
    containerId: input.containerId ?? null,
    categoryId: input.categoryId ?? null,
    name: input.name.trim(),
    quantity: Math.max(1, input.quantity ?? 1),
    packed: false,
    notes: input.notes?.trim() || undefined,
    weight: input.weight && input.weight > 0 ? input.weight : undefined,
    sortOrder: ts,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateItem(
  id: string,
  patch: Partial<Omit<Item, "id" | "tripId" | "createdAt">>,
): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: now() });
}

export async function togglePacked(id: string): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  await db.items.update(id, { packed: !item.packed, updatedAt: now() });
}

export async function moveItem(
  id: string,
  containerId: string | null,
): Promise<void> {
  await db.items.update(id, { containerId, updatedAt: now() });
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id);
}

/** Puts a just-deleted item back exactly as it was (powers the Undo toast). */
export async function restoreItem(item: Item): Promise<void> {
  await db.items.put({ ...item, updatedAt: now() });
}

/** Sets `packed` for every item in a container (used by bulk pack/unpack). */
export async function setPackedForItems(
  ids: string[],
  packed: boolean,
): Promise<void> {
  if (ids.length === 0) return;
  await db.items.where("id").anyOf(ids).modify({ packed, updatedAt: now() });
}

/**
 * Assigns `containerId` and a sequential `sortOrder` (0..n) to the given items,
 * in order. Used by drag-and-drop to both reorder within a container and move an
 * item into a new container in one shot.
 */
export async function setItemsOrder(
  containerId: string | null,
  orderedItemIds: string[],
): Promise<void> {
  if (orderedItemIds.length === 0) return;
  const ts = now();
  await db.transaction("rw", db.items, async () => {
    await Promise.all(
      orderedItemIds.map((id, index) =>
        db.items.update(id, { containerId, sortOrder: index, updatedAt: ts }),
      ),
    );
  });
}

/** Rewrites `sortOrder = index` for the given containers (sibling reorder). */
export async function reorderContainers(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  await db.transaction("rw", db.containers, async () => {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.containers.update(id, { sortOrder: index }),
      ),
    );
  });
}

/* ----------------------------- Categories ----------------------------- */

export async function addCategory(name: string, color: string): Promise<string> {
  const id = uid();
  const max = await db.categories.orderBy("sortOrder").last();
  await db.categories.add({
    id,
    name: name.trim(),
    color,
    sortOrder: (max?.sortOrder ?? -1) + 1,
  });
  return id;
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; color: string }>,
): Promise<void> {
  await db.categories.update(id, patch);
}

/** Deletes a category and clears it from any items that referenced it. */
export async function deleteCategory(id: string): Promise<void> {
  await db.transaction("rw", db.categories, db.items, async () => {
    await db.items.where("categoryId").equals(id).modify({ categoryId: null });
    await db.categories.delete(id);
  });
}
