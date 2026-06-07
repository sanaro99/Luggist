import { db } from "./db";
import {
  addCategory,
  addContainer,
  addItem,
  createTrip,
  type TripInput,
} from "./repo";
import { COLOR_PALETTE } from "./seed";
import type {
  TemplateContainer,
  TemplateData,
  TemplateItem,
} from "./types";

const uid = (): string => crypto.randomUUID();

/* --------------------------- Save / instantiate ----------------------- */

/** Snapshots a trip's bags, cubes and items (minus packed state) as a template. */
export async function saveTripAsTemplate(
  tripId: string,
  name: string,
  description?: string,
): Promise<string> {
  const [containers, items, categories] = await Promise.all([
    db.containers.where("tripId").equals(tripId).toArray(),
    db.items.where("tripId").equals(tripId).toArray(),
    db.categories.toArray(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const tempIdByReal = new Map<string, string>();
  for (const c of containers) tempIdByReal.set(c.id, uid());

  const tplContainers: TemplateContainer[] = [...containers]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      tempId: tempIdByReal.get(c.id)!,
      parentTempId: c.parentId ? tempIdByReal.get(c.parentId) ?? null : null,
      kind: c.kind,
      name: c.name,
      color: c.color,
      sortOrder: c.sortOrder,
    }));

  const tplItems: TemplateItem[] = [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => ({
      name: it.name,
      containerTempId: it.containerId
        ? tempIdByReal.get(it.containerId) ?? null
        : null,
      categoryName: it.categoryId ? categoryName.get(it.categoryId) ?? null : null,
      quantity: it.quantity,
      notes: it.notes,
      sortOrder: it.sortOrder,
    }));

  const id = uid();
  await db.templates.add({
    id,
    name: name.trim(),
    description: description?.trim() || undefined,
    data: { containers: tplContainers, items: tplItems },
    createdAt: Date.now(),
  });
  return id;
}

/** Creates a brand-new trip from a template. Items start unpacked. */
export async function createTripFromTemplate(
  templateId: string,
  tripInput: TripInput,
): Promise<string | null> {
  const template = await db.templates.get(templateId);
  if (!template) return null;

  const tripId = await createTrip(tripInput);
  const realByTemp = new Map<string, string>();

  // Create containers parent-first so cubes can resolve their bag.
  for (const c of orderParentFirst(template.data.containers)) {
    const parentRealId = c.parentTempId
      ? realByTemp.get(c.parentTempId) ?? null
      : null;
    const newId = await addContainer(tripId, c.kind, c.name, parentRealId, c.color);
    realByTemp.set(c.tempId, newId);
  }

  for (const it of template.data.items) {
    const categoryId = it.categoryName
      ? await getOrCreateCategoryByName(it.categoryName)
      : null;
    const containerId = it.containerTempId
      ? realByTemp.get(it.containerTempId) ?? null
      : null;
    await addItem(tripId, {
      name: it.name,
      containerId,
      categoryId,
      quantity: it.quantity,
      notes: it.notes,
    });
  }

  return tripId;
}

function orderParentFirst(containers: TemplateContainer[]): TemplateContainer[] {
  const result: TemplateContainer[] = [];
  for (const root of containers.filter((c) => c.parentTempId === null)) {
    result.push(root);
    result.push(...containers.filter((c) => c.parentTempId === root.tempId));
  }
  for (const c of containers) if (!result.includes(c)) result.push(c); // orphans
  return result;
}

/** Resolves a category by name (case-insensitive), creating it if missing. */
export async function getOrCreateCategoryByName(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.categories.toArray();
  const match = existing.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match.id;
  const color = COLOR_PALETTE[existing.length % COLOR_PALETTE.length];
  return addCategory(trimmed, color);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  await db.templates.update(id, { name: name.trim() });
}

/* ----------------------------- Built-in seed -------------------------- */

interface SeedItem {
  name: string;
  category?: string;
  quantity?: number;
}
interface SeedBag {
  name: string;
  color?: string;
  items?: SeedItem[];
  cubes?: { name: string; color?: string; items?: SeedItem[] }[];
}

function buildTemplateData(bags: SeedBag[]): TemplateData {
  const containers: TemplateContainer[] = [];
  const items: TemplateItem[] = [];
  let order = 0;
  let itemOrder = 0;
  const pushItems = (list: SeedItem[] | undefined, containerTempId: string) => {
    for (const it of list ?? []) {
      items.push({
        name: it.name,
        containerTempId,
        categoryName: it.category ?? null,
        quantity: it.quantity ?? 1,
        sortOrder: itemOrder++,
      });
    }
  };
  for (const bag of bags) {
    const bagId = uid();
    containers.push({
      tempId: bagId,
      parentTempId: null,
      kind: "bag",
      name: bag.name,
      color: bag.color,
      sortOrder: order++,
    });
    pushItems(bag.items, bagId);
    for (const cube of bag.cubes ?? []) {
      const cubeId = uid();
      containers.push({
        tempId: cubeId,
        parentTempId: bagId,
        kind: "cube",
        name: cube.name,
        color: cube.color,
        sortOrder: order++,
      });
      pushItems(cube.items, cubeId);
    }
  }
  return { containers, items };
}

const BUILTIN_TEMPLATES: { name: string; description: string; data: TemplateData }[] = [
  {
    name: "Weekend getaway",
    description: "Two nights, one bag",
    data: buildTemplateData([
      {
        name: "Weekend bag",
        color: "#3b82f6",
        items: [
          { name: "T-shirts", category: "Clothes", quantity: 2 },
          { name: "Underwear", category: "Clothes", quantity: 3 },
          { name: "Socks", category: "Clothes", quantity: 3 },
          { name: "Toiletry bag", category: "Toiletries" },
          { name: "Phone charger", category: "Electronics" },
          { name: "Wallet", category: "Documents" },
        ],
      },
    ]),
  },
  {
    name: "Beach vacation",
    description: "Sun, sand, and sea",
    data: buildTemplateData([
      {
        name: "Suitcase",
        color: "#f59e0b",
        items: [
          { name: "Swimsuit", category: "Clothes", quantity: 2 },
          { name: "Sunscreen", category: "Toiletries" },
          { name: "Sunglasses", category: "Misc" },
          { name: "Flip-flops", category: "Clothes" },
          { name: "Beach towel", category: "Misc" },
          { name: "Sun hat", category: "Clothes" },
        ],
      },
    ]),
  },
  {
    name: "Business trip",
    description: "Meetings and travel",
    data: buildTemplateData([
      {
        name: "Carry-on",
        color: "#6366f1",
        items: [
          { name: "Laptop", category: "Electronics" },
          { name: "Laptop charger", category: "Electronics" },
          { name: "Dress shirts", category: "Clothes", quantity: 2 },
          { name: "Trousers", category: "Clothes" },
          { name: "Passport", category: "Documents" },
          { name: "Toiletry bag", category: "Toiletries" },
        ],
      },
    ]),
  },
];

let seeding: Promise<void> | null = null;

/** Seeds built-in starter templates on first run. Idempotent. */
export function ensureTemplatesSeeded(): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      const count = await db.templates.count();
      if (count === 0) {
        await db.templates.bulkAdd(
          BUILTIN_TEMPLATES.map((t) => ({
            id: uid(),
            name: t.name,
            description: t.description,
            builtIn: true,
            data: t.data,
            createdAt: Date.now(),
          })),
        );
      }
    })().catch((err) => {
      seeding = null;
      throw err;
    });
  }
  return seeding;
}
