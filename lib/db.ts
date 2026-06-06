import Dexie, { type Table } from "dexie";
import type { Trip, Container, Item, Category } from "./types";

/**
 * Luggist's local database. IndexedDB does not index `null` values, so
 * `parentId` / `containerId` are intentionally NOT used as primary query
 * indexes — trip-scoped data is loaded by `tripId` and grouped in memory
 * (datasets per trip are small).
 */
export class LuggistDB extends Dexie {
  trips!: Table<Trip, string>;
  containers!: Table<Container, string>;
  items!: Table<Item, string>;
  categories!: Table<Category, string>;

  constructor() {
    super("luggist");
    this.version(1).stores({
      trips: "id, updatedAt, createdAt",
      containers: "id, tripId",
      items: "id, tripId, categoryId",
      categories: "id, sortOrder",
    });
  }
}

export const db = new LuggistDB();
