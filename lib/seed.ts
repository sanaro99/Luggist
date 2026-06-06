import { db } from "./db";
import type { Category } from "./types";

const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Clothes", color: "#3b82f6", sortOrder: 0 },
  { name: "Electronics", color: "#8b5cf6", sortOrder: 1 },
  { name: "Toiletries", color: "#14b8a6", sortOrder: 2 },
  { name: "Documents", color: "#ef4444", sortOrder: 3 },
  { name: "Health", color: "#10b981", sortOrder: 4 },
  { name: "Misc", color: "#f59e0b", sortOrder: 5 },
];

let seeding: Promise<void> | null = null;

/** Seeds a starter set of categories the first time the app runs. Idempotent. */
export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const count = await db.categories.count();
      if (count === 0) {
        await db.categories.bulkAdd(
          DEFAULT_CATEGORIES.map((c) => ({ ...c, id: crypto.randomUUID() })),
        );
      }
    })().catch((err) => {
      seeding = null; // allow retry on failure
      throw err;
    });
  }
  return seeding;
}

/** A palette offered when creating new categories / containers. */
export const COLOR_PALETTE = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#6366f1",
  "#64748b",
];
