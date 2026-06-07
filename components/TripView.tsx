"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  deleteContainer,
  deleteItem,
  deleteTrip,
  setPackedForItems,
} from "@/lib/repo";
import { buildTree, progressOf } from "@/lib/progress";
import { formatDateRange } from "@/lib/format";
import type { Container, ContainerKind, Item } from "@/lib/types";
import ProgressBar from "./ProgressBar";
import ContainerSection from "./ContainerSection";
import ItemRow from "./ItemRow";
import SearchBar from "./SearchBar";
import CategoryFilter, { UNCATEGORIZED } from "./CategoryFilter";
import Menu from "./Menu";
import TripForm from "./TripForm";
import ItemForm from "./ItemForm";
import ContainerForm from "./ContainerForm";
import ManageCategories from "./ManageCategories";
import ConfirmDialog from "./ConfirmDialog";
import QuickAddItem from "./QuickAddItem";
import type { MenuAction } from "./Menu";

export default function TripView({ tripId }: { tripId: string }) {
  const router = useRouter();

  const trip = useLiveQuery(
    async () => (await db.trips.get(tripId)) ?? null,
    [tripId],
  );
  const containers = useLiveQuery(
    () => db.containers.where("tripId").equals(tripId).toArray(),
    [tripId],
  );
  const items = useLiveQuery(
    () => db.items.where("tripId").equals(tripId).toArray(),
    [tripId],
  );
  const categories = useLiveQuery(() =>
    db.categories.orderBy("sortOrder").toArray(),
  );

  // UI state
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingTrip, setEditingTrip] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [itemForm, setItemForm] = useState<{
    open: boolean;
    item?: Item;
    defaultContainerId: string | null;
  }>({ open: false, defaultContainerId: null });
  const [containerForm, setContainerForm] = useState<{
    open: boolean;
    kind: ContainerKind;
    parentId: string | null;
    container?: Container;
  }>({ open: false, kind: "bag", parentId: null });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message?: string;
    action: () => void;
  }>({ open: false, title: "", action: () => {} });

  const categoriesById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items ?? []) {
      const key = item.categoryId ?? UNCATEGORIZED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const query = search.trim().toLowerCase();
  const filtering = query !== "" || selected.size > 0;

  const filteredItems = useMemo(() => {
    return (items ?? []).filter((it) => {
      if (query && !it.name.toLowerCase().includes(query)) return false;
      if (selected.size > 0 && !selected.has(it.categoryId ?? UNCATEGORIZED)) {
        return false;
      }
      return true;
    });
  }, [items, query, selected]);

  const tree = useMemo(
    () => buildTree(containers ?? [], filteredItems),
    [containers, filteredItems],
  );

  // Loading / not-found
  if (
    trip === undefined ||
    containers === undefined ||
    items === undefined ||
    categories === undefined
  ) {
    return (
      <div className="space-y-3">
        <div className="card h-32 animate-pulse bg-slate-100" />
        <div className="card h-24 animate-pulse bg-slate-100" />
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="card px-6 py-16 text-center">
        <p className="text-slate-600">This trip could not be found.</p>
        <Link href="/" className="btn-primary mt-5 inline-flex">
          Back to trips
        </Link>
      </div>
    );
  }

  const overall = progressOf(items);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const isEmpty = containers.length === 0 && items.length === 0;

  const toggleCategory = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openAddItem = (containerId: string | null) =>
    setItemForm({ open: true, defaultContainerId: containerId });
  const openEditItem = (item: Item) =>
    setItemForm({ open: true, item, defaultContainerId: item.containerId });
  const openAddBag = () =>
    setContainerForm({ open: true, kind: "bag", parentId: null });
  const openAddCube = (bagId: string) =>
    setContainerForm({ open: true, kind: "cube", parentId: bagId });
  const openEditContainer = (c: Container) =>
    setContainerForm({ open: true, kind: c.kind, parentId: c.parentId, container: c });

  const askDeleteTrip = () =>
    setConfirm({
      open: true,
      title: "Delete trip?",
      message: `"${trip.name}" and all of its bags, cubes and items will be permanently removed.`,
      action: async () => {
        await deleteTrip(tripId);
        router.push("/");
      },
    });
  const askDeleteContainer = (c: Container) =>
    setConfirm({
      open: true,
      title: c.kind === "bag" ? "Delete bag?" : "Delete cube?",
      message: "Items inside will be moved to Unassigned, not deleted.",
      action: () => void deleteContainer(c.id),
    });
  const askDeleteItem = (it: Item) =>
    setConfirm({
      open: true,
      title: "Delete item?",
      message: `"${it.name}" will be removed.`,
      action: () => void deleteItem(it.id),
    });

  const unassignedProgress = progressOf(tree.unassigned);
  const allItemIds = items.map((i) => i.id);

  const tripMenuActions: MenuAction[] = [
    { label: "Edit trip", onClick: () => setEditingTrip(true) },
    ...(overall.total > 0 && overall.packed < overall.total
      ? [
          {
            label: "Mark all packed",
            onClick: () => setPackedForItems(allItemIds, true),
          },
        ]
      : []),
    ...(overall.packed > 0
      ? [
          {
            label: "Mark all unpacked",
            onClick: () => setPackedForItems(allItemIds, false),
          },
        ]
      : []),
    { label: "Manage categories", onClick: () => setShowCategories(true) },
    { label: "Delete trip", onClick: askDeleteTrip, danger: true },
  ];

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← All trips
      </Link>

      {/* Trip header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
              {trip.name}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {trip.destination && <span>📍 {trip.destination}</span>}
              {trip.destination && dates && <span className="mx-1.5">·</span>}
              {dates && <span>{dates}</span>}
            </p>
          </div>
          <Menu ariaLabel="Trip options" actions={tripMenuActions} />
        </div>
        {trip.notes && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {trip.notes}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar packed={overall.packed} total={overall.total} className="flex-1" />
          <span className="whitespace-nowrap text-sm font-medium text-slate-600">
            {overall.total === 0
              ? "No items yet"
              : `${overall.packed}/${overall.total} · ${overall.pct}%`}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn-primary" onClick={() => openAddItem(null)}>
          ＋ Item
        </button>
        <button className="btn-secondary" onClick={openAddBag}>
          ＋ Bag
        </button>
      </div>
      {categories.length > 0 && (
        <div className="mt-3">
          <CategoryFilter
            categories={categories}
            counts={categoryCounts}
            selected={selected}
            onToggle={toggleCategory}
            onClear={() => setSelected(new Set())}
          />
        </div>
      )}

      {/* Body */}
      <div className="mt-4">
        {isEmpty ? (
          <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="text-4xl" aria-hidden>
              📦
            </span>
            <h2 className="mt-3 font-semibold text-slate-900">
              Start your packing list
            </h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Add a bag to organize your packing, or jump straight to adding items.
            </p>
            <div className="mt-5 flex gap-2">
              <button className="btn-primary" onClick={openAddBag}>
                Add a bag
              </button>
              <button className="btn-secondary" onClick={() => openAddItem(null)}>
                Add an item
              </button>
            </div>
          </div>
        ) : filtering && filteredItems.length === 0 ? (
          <div className="card px-6 py-12 text-center text-sm text-slate-500">
            No items match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {tree.roots.map((node) => (
              <ContainerSection
                key={node.container.id}
                node={node}
                categoriesById={categoriesById}
                filtering={filtering}
                onAddItem={(id) => openAddItem(id)}
                onAddCube={openAddCube}
                onEditContainer={openEditContainer}
                onDeleteContainer={askDeleteContainer}
                onEditItem={openEditItem}
                onDeleteItem={askDeleteItem}
              />
            ))}

            {tree.unassigned.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-medium text-slate-700">
                    Unassigned
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      unassignedProgress.done ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {unassignedProgress.done
                      ? "Packed ✓"
                      : `${unassignedProgress.packed}/${unassignedProgress.total}`}
                  </span>
                </div>
                {unassignedProgress.total > 0 && (
                  <ProgressBar
                    packed={unassignedProgress.packed}
                    total={unassignedProgress.total}
                    size="sm"
                    className="mt-2.5"
                  />
                )}
                <div className="mt-3 space-y-1">
                  {tree.unassigned.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      category={
                        item.categoryId
                          ? categoriesById.get(item.categoryId)
                          : undefined
                      }
                      onEdit={openEditItem}
                      onDelete={askDeleteItem}
                    />
                  ))}
                  {!filtering && (
                    <QuickAddItem
                      tripId={tripId}
                      containerId={null}
                      onOpenFull={() => openAddItem(null)}
                    />
                  )}
                </div>
              </div>
            )}

            {!filtering && (
              <button
                onClick={openAddBag}
                className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600"
              >
                ＋ Add bag
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <TripForm open={editingTrip} onClose={() => setEditingTrip(false)} trip={trip} />
      <ItemForm
        open={itemForm.open}
        onClose={() => setItemForm((s) => ({ ...s, open: false }))}
        tripId={tripId}
        containers={containers}
        categories={categories}
        item={itemForm.item}
        defaultContainerId={itemForm.defaultContainerId}
      />
      <ContainerForm
        open={containerForm.open}
        onClose={() => setContainerForm((s) => ({ ...s, open: false }))}
        tripId={tripId}
        kind={containerForm.kind}
        parentId={containerForm.parentId}
        container={containerForm.container}
      />
      <ManageCategories
        open={showCategories}
        onClose={() => setShowCategories(false)}
      />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.action}
        onClose={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
