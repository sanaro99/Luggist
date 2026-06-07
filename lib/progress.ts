import type { Container, Item } from "./types";

export interface Progress {
  packed: number;
  total: number;
  pct: number;
  done: boolean;
}

/** Computes packed/total/percentage for a list of items. */
export function progressOf(items: Item[]): Progress {
  const total = items.length;
  const packed = items.reduce((n, i) => n + (i.packed ? 1 : 0), 0);
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  return { packed, total, pct, done: total > 0 && packed === total };
}

export interface ContainerNode {
  container: Container;
  items: Item[]; // items directly in this container
  children: ContainerNode[]; // nested cubes
}

/**
 * Builds the bag → cube tree for a trip and attaches each container's direct
 * items. Items whose container was deleted (or never assigned) are returned
 * separately as `unassigned`.
 */
export function buildTree(
  containers: Container[],
  items: Item[],
): { roots: ContainerNode[]; unassigned: Item[] } {
  const byContainer = new Map<string, Item[]>();
  const unassigned: Item[] = [];
  const validIds = new Set(containers.map((c) => c.id));

  for (const item of items) {
    if (item.containerId && validIds.has(item.containerId)) {
      const list = byContainer.get(item.containerId) ?? [];
      list.push(item);
      byContainer.set(item.containerId, list);
    } else {
      unassigned.push(item);
    }
  }

  const sortItems = (a: Item, b: Item) => a.sortOrder - b.sortOrder;
  const sortContainers = (a: Container, b: Container) => a.sortOrder - b.sortOrder;

  const makeNode = (container: Container): ContainerNode => ({
    container,
    items: (byContainer.get(container.id) ?? []).sort(sortItems),
    children: containers
      .filter((c) => c.parentId === container.id)
      .sort(sortContainers)
      .map(makeNode),
  });

  const roots = containers
    .filter((c) => c.parentId === null)
    .sort(sortContainers)
    .map(makeNode);

  unassigned.sort(sortItems);
  return { roots, unassigned };
}

/** All items contained in a node, including those in nested cubes. */
export function flattenItems(node: ContainerNode): Item[] {
  return [...node.items, ...node.children.flatMap(flattenItems)];
}

/** Drops containers that (recursively) hold no items — used while filtering. */
export function pruneEmpty(nodes: ContainerNode[]): ContainerNode[] {
  return nodes
    .map((n) => ({ ...n, children: pruneEmpty(n.children) }))
    .filter((n) => n.items.length > 0 || n.children.length > 0);
}
