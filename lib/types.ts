// Core domain types for Luggist. All data is stored locally in IndexedDB.

export type ID = string;

export interface Trip {
  id: ID;
  name: string;
  destination?: string;
  startDate?: string; // ISO date string (yyyy-mm-dd)
  endDate?: string; // ISO date string (yyyy-mm-dd)
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ContainerKind = "bag" | "cube";

/**
 * A container holds items. A top-level bag has `parentId === null`; a packing
 * cube is a container nested inside a bag (`parentId === <bagId>`).
 */
export interface Container {
  id: ID;
  tripId: ID;
  parentId: ID | null;
  kind: ContainerKind;
  name: string;
  color?: string;
  sortOrder: number;
  createdAt: number;
}

export interface Item {
  id: ID;
  tripId: ID;
  containerId: ID | null; // null = unassigned / loose in the trip
  categoryId: ID | null;
  name: string;
  quantity: number;
  packed: boolean;
  notes?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** Categories are global (app-wide) and reused across trips. */
export interface Category {
  id: ID;
  name: string;
  color: string;
  sortOrder: number;
}
