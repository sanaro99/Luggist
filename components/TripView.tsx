"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { db } from "@/lib/db";
import {
  addItem,
  deleteContainer,
  deleteItem,
  deleteTrip,
  reorderContainers,
  restoreItem,
  setItemsOrder,
  setPackedForItems,
  updateItem,
} from "@/lib/repo";
import { getOrCreateCategoryByName } from "@/lib/templates";
import {
  aiAudit,
  aiCategorize,
  categorizeOffline,
  type AuditSuggestion,
} from "@/lib/ai/client";
import {
  buildTree,
  itemComparator,
  progressOf,
  pruneEmpty,
  weightOf,
  type ItemSort,
} from "@/lib/progress";
import { formatDateRange, formatKg } from "@/lib/format";
import { celebrate } from "@/lib/confetti";
import { containerDragId, parseDragId } from "@/lib/dnd";
import type { Container, ContainerKind, Item } from "@/lib/types";
import { useToast } from "./Toaster";
import ProgressBar from "./ProgressBar";
import TripProgressStrip from "./TripProgressStrip";
import CountdownBadge from "./CountdownBadge";
import ContainerSection from "./ContainerSection";
import UnassignedSection from "./UnassignedSection";
import SearchBar from "./SearchBar";
import CategoryFilter, { UNCATEGORIZED } from "./CategoryFilter";
import Menu, { type MenuAction } from "./Menu";
import TripForm from "./TripForm";
import ItemForm from "./ItemForm";
import ContainerForm from "./ContainerForm";
import ManageCategories from "./ManageCategories";
import ConfirmDialog from "./ConfirmDialog";
import SaveAsTemplate from "./SaveAsTemplate";
import AiGenerateList from "./AiGenerateList";
import AuditSuggestions from "./AuditSuggestions";

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-base-200/70 px-2.5 py-1 text-xs font-medium text-base-content/70">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

export default function TripView({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { toast } = useToast();

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
  const [unpackedOnly, setUnpackedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<ItemSort>("manual");
  const [editingTrip, setEditingTrip] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [audit, setAudit] = useState<{
    open: boolean;
    loading: boolean;
    suggestions: AuditSuggestion[];
  }>({ open: false, loading: false, suggestions: [] });
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
  const [activeDrag, setActiveDrag] = useState<{
    type: "item" | "container";
    label: string;
  } | null>(null);

  // The compact progress strip appears once the header card scrolls away.
  const headerCardRef = useRef<HTMLDivElement>(null);
  const [headerAway, setHeaderAway] = useState(false);
  const loaded = trip != null;
  useEffect(() => {
    if (!loaded) return;
    const el = headerCardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderAway(!entry.isIntersecting),
      // Treat the card as gone once it's fully behind the sticky site header.
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
  // A reduced item set (search / category / unpacked-only) prunes empties and
  // hides quick-add; any of these — or a non-manual sort — also pauses DnD.
  const filtered = query !== "" || selected.size > 0 || unpackedOnly;
  const dndDisabled = filtered || sortMode !== "manual";

  const filteredItems = useMemo(() => {
    return (items ?? []).filter((it) => {
      if (query && !it.name.toLowerCase().includes(query)) return false;
      if (selected.size > 0 && !selected.has(it.categoryId ?? UNCATEGORIZED)) {
        return false;
      }
      if (unpackedOnly && it.packed) return false;
      return true;
    });
  }, [items, query, selected, unpackedOnly]);

  const tree = useMemo(
    () => buildTree(containers ?? [], filteredItems, itemComparator(sortMode)),
    [containers, filteredItems, sortMode],
  );

  // Fire the celebration when the trip flips to fully packed.
  const allPacked =
    !!items && items.length > 0 && items.every((i) => i.packed);
  const wasAllPacked = useRef(false);
  useEffect(() => {
    if (allPacked && !wasAllPacked.current) {
      celebrate();
      toast("Everything packed! Bon voyage 🎉", { icon: "🎉", duration: 3400 });
    }
    wasAllPacked.current = allPacked;
  }, [allPacked, toast]);

  // Loading / not-found
  if (
    trip === undefined ||
    containers === undefined ||
    items === undefined ||
    categories === undefined
  ) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-12 rounded-2xl" />
        <div className="skeleton h-28 rounded-3xl" />
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="card border border-base-300/70 bg-base-100/80 px-6 py-16 text-center backdrop-blur">
        <p className="text-base-content/70">This trip could not be found.</p>
        <Link href="/" className="btn btn-primary mt-5 inline-flex w-fit self-center">
          Back to trips
        </Link>
      </div>
    );
  }

  const overall = progressOf(items);
  const totalWeight = weightOf(items);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const isEmpty = containers.length === 0 && items.length === 0;
  const bagCount = containers.filter((c) => c.kind === "bag").length;
  const cubeCount = containers.filter((c) => c.kind === "cube").length;

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
        toast("Trip deleted", { tone: "info", icon: "🗑️" });
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
  // Item deletes skip the confirm dialog: they're instantly reversible via
  // the Undo action on the toast (container/trip deletes still confirm).
  const removeItem = async (it: Item) => {
    await deleteItem(it.id);
    toast(`Deleted “${it.name}”`, {
      tone: "info",
      icon: "🗑️",
      action: { label: "Undo", onClick: () => void restoreItem(it) },
    });
  };

  // Coarse season hint from the start month; the model also gets the
  // destination, so it can correct for hemisphere.
  const seasonOf = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const m = new Date(`${iso}T00:00:00`).getMonth();
    if (m <= 1 || m === 11) return "winter";
    if (m <= 4) return "spring";
    if (m <= 7) return "summer";
    return "autumn";
  };

  // B2: ask the model what's missing. State is set in this event handler
  // (never an effect), so the modal stays purely presentational.
  const runAudit = async () => {
    setAudit({ open: true, loading: true, suggestions: [] });
    const res = await aiAudit({
      destination: trip.destination,
      season: seasonOf(trip.startDate),
      existingNames: items.map((i) => i.name),
    });
    if (res.ok) {
      setAudit({ open: true, loading: false, suggestions: res.data });
    } else {
      setAudit({ open: false, loading: false, suggestions: [] });
      toast(res.error, { tone: "info", icon: "🤖" });
    }
  };

  const addSuggestion = async (s: AuditSuggestion) => {
    const categoryId = s.categoryName
      ? await getOrCreateCategoryByName(s.categoryName)
      : null;
    await addItem(tripId, { name: s.name, categoryId });
    setAudit((a) => ({
      ...a,
      suggestions: a.suggestions.filter((x) => x.name !== s.name),
    }));
    toast(`Added “${s.name}”`);
  };

  // B4 AI batch: tidy up items with no category. Offline keyword map first,
  // model only for the leftovers it couldn't classify.
  const autoCategorize = async () => {
    const uncategorized = items.filter((i) => !i.categoryId);
    if (uncategorized.length === 0) {
      toast("Everything's already categorized", { tone: "info", icon: "🏷️" });
      return;
    }
    let done = 0;
    const remaining: Item[] = [];
    for (const it of uncategorized) {
      const guess = categorizeOffline(it.name);
      if (guess) {
        await updateItem(it.id, {
          categoryId: await getOrCreateCategoryByName(guess),
        });
        done++;
      } else {
        remaining.push(it);
      }
    }
    if (remaining.length > 0) {
      const res = await aiCategorize(remaining.map((i) => i.name));
      if (res.ok) {
        for (const it of remaining) {
          const cat = res.data[it.name.toLowerCase()];
          if (cat) {
            await updateItem(it.id, {
              categoryId: await getOrCreateCategoryByName(cat),
            });
            done++;
          }
        }
      }
    }
    toast(
      done > 0
        ? `Categorized ${done} ${done === 1 ? "item" : "items"}`
        : "Couldn't auto-categorize those",
      { tone: done > 0 ? "success" : "info", icon: "🏷️" },
    );
  };

  const allItemIds = items.map((i) => i.id);
  const visibleRoots = filtered ? pruneEmpty(tree.roots) : tree.roots;
  const rootIds = visibleRoots.map((n) => containerDragId(n.container.id));

  const orderedItemIdsFor = (containerId: string | null): string[] =>
    items
      .filter((i) => i.containerId === containerId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.id);

  const handleDragStart = (e: DragStartEvent) => {
    const a = parseDragId(String(e.active.id));
    if (a.type === "item") {
      const it = items.find((i) => i.id === a.id);
      setActiveDrag(it ? { type: "item", label: it.name } : null);
    } else if (a.type === "container") {
      const c = containers.find((x) => x.id === a.id);
      setActiveDrag(c ? { type: "container", label: c.name } : null);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over || String(active.id) === String(over.id)) return;
    const a = parseDragId(String(active.id));
    const o = parseDragId(String(over.id));

    if (a.type === "container") {
      if (o.type !== "container") return;
      const activeC = containers.find((c) => c.id === a.id);
      const overC = containers.find((c) => c.id === o.id);
      if (!activeC || !overC || activeC.parentId !== overC.parentId) return;
      const siblingIds = containers
        .filter((c) => c.parentId === activeC.parentId)
        .sort((x, y) => x.sortOrder - y.sortOrder)
        .map((c) => c.id);
      const oldIndex = siblingIds.indexOf(a.id);
      const newIndex = siblingIds.indexOf(o.id);
      if (oldIndex < 0 || newIndex < 0) return;
      reorderContainers(arrayMove(siblingIds, oldIndex, newIndex));
      return;
    }

    if (a.type === "item") {
      const item = items.find((i) => i.id === a.id);
      if (!item) return;
      let targetContainerId: string | null;
      if (o.type === "item") {
        const overItem = items.find((i) => i.id === o.id);
        if (!overItem) return;
        targetContainerId = overItem.containerId;
      } else if (o.type === "zone") {
        targetContainerId = o.id === "unassigned" ? null : o.id;
      } else if (o.type === "container") {
        targetContainerId = o.id;
      } else {
        return;
      }

      if (item.containerId === targetContainerId) {
        const ids = orderedItemIdsFor(targetContainerId);
        const oldIndex = ids.indexOf(a.id);
        const newIndex = o.type === "item" ? ids.indexOf(o.id) : ids.length - 1;
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        setItemsOrder(targetContainerId, arrayMove(ids, oldIndex, newIndex));
      } else {
        const ids = orderedItemIdsFor(targetContainerId).filter(
          (id) => id !== a.id,
        );
        const insertIndex =
          o.type === "item" ? Math.max(0, ids.indexOf(o.id)) : ids.length;
        ids.splice(insertIndex, 0, a.id);
        setItemsOrder(targetContainerId, ids);
      }
    }
  };

  const hasUncategorized = items.some((i) => !i.categoryId);
  const tripMenuActions: MenuAction[] = [
    { label: "Edit trip", onClick: () => setEditingTrip(true) },
    { label: "✨ Generate with AI", onClick: () => setShowGenerate(true) },
    ...(items.length > 0
      ? [{ label: "What am I forgetting?", onClick: runAudit }]
      : []),
    ...(hasUncategorized
      ? [{ label: "Auto-categorize items", onClick: autoCategorize }]
      : []),
    ...(overall.total > 0 && overall.packed < overall.total
      ? [
          {
            label: "Mark all packed",
            onClick: () => {
              setPackedForItems(allItemIds, true);
            },
          },
        ]
      : []),
    ...(overall.packed > 0
      ? [
          {
            label: "Mark all unpacked",
            onClick: () => {
              setPackedForItems(allItemIds, false);
              toast("Unpacked everything", { tone: "info", icon: "↩️" });
            },
          },
        ]
      : []),
    { label: "Save as template", onClick: () => setShowSaveTemplate(true) },
    { label: "Manage categories", onClick: () => setShowCategories(true) },
    { label: "Delete trip", onClick: askDeleteTrip, danger: true },
  ];

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-base-content/55 transition-colors hover:text-base-content"
      >
        ← All trips
      </Link>

      {headerAway && (
        <TripProgressStrip
          name={trip.name}
          packed={overall.packed}
          total={overall.total}
          onAddItem={() => openAddItem(null)}
        />
      )}

      {/* Trip header */}
      <div
        ref={headerCardRef}
        className="card animate-rise border border-base-300/70 bg-base-100/90 p-5 shadow-sm backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display truncate text-2xl font-semibold tracking-tight text-base-content">
              {trip.name}
            </h1>
            <p className="mt-0.5 text-sm text-base-content/55">
              {trip.destination && <span>📍 {trip.destination}</span>}
              {trip.destination && dates && <span className="mx-1.5">·</span>}
              {dates && <span>{dates}</span>}
            </p>
          </div>
          <Menu ariaLabel="Trip options" actions={tripMenuActions} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CountdownBadge start={trip.startDate} end={trip.endDate} />
          <StatChip icon="🧳" label={`${bagCount} ${bagCount === 1 ? "bag" : "bags"}`} />
          {cubeCount > 0 && (
            <StatChip icon="🧦" label={`${cubeCount} ${cubeCount === 1 ? "cube" : "cubes"}`} />
          )}
          <StatChip icon="📦" label={`${overall.total} ${overall.total === 1 ? "item" : "items"}`} />
          {totalWeight > 0 && <StatChip icon="⚖️" label={formatKg(totalWeight)} />}
        </div>

        {trip.notes && (
          <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-base-200/60 p-3 text-sm text-base-content/70">
            {trip.notes}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar packed={overall.packed} total={overall.total} className="flex-1" />
          <span
            className={`font-display whitespace-nowrap text-sm font-semibold ${
              overall.done ? "text-success" : "text-base-content/70"
            }`}
          >
            {overall.total === 0
              ? "No items yet"
              : overall.done
                ? "All packed ✓"
                : `${overall.packed}/${overall.total} · ${overall.pct}%`}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} />
        <button className="btn btn-primary" onClick={() => openAddItem(null)}>
          ＋ Item
        </button>
        <button className="btn btn-ghost border border-base-300" onClick={openAddBag}>
          ＋ Bag
        </button>
      </div>

      {/* Filters / sort */}
      {!isEmpty && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-base-content/70">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={unpackedOnly}
              onChange={(e) => setUnpackedOnly(e.target.checked)}
            />
            Unpacked only
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm text-base-content/70">
            <span>Sort</span>
            <select
              className="select select-bordered select-sm rounded-full"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as ItemSort)}
              aria-label="Sort items"
            >
              <option value="manual">Manual</option>
              <option value="az">A – Z</option>
              <option value="packed">Packed last</option>
            </select>
          </label>
        </div>
      )}

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
          <div className="card animate-rise border border-base-300/70 bg-base-100/80 backdrop-blur">
            <div className="card-body items-center px-6 py-14 text-center">
              <span className="animate-float text-5xl" aria-hidden>
                📦
              </span>
              <h2 className="font-display mt-3 text-lg font-semibold text-base-content">
                Start your packing list
              </h2>
              <p className="mt-1 max-w-xs text-sm text-base-content/60">
                Add a bag to organize your packing, or jump straight to adding
                items.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowGenerate(true)}
                >
                  ✨ Generate with AI
                </button>
                <button className="btn btn-ghost border border-base-300" onClick={openAddBag}>
                  Add a bag
                </button>
                <button className="btn btn-ghost border border-base-300" onClick={() => openAddItem(null)}>
                  Add an item
                </button>
              </div>
            </div>
          </div>
        ) : filtered && filteredItems.length === 0 ? (
          <div className="card border border-base-300/70 bg-base-100/70 px-6 py-12 text-center text-sm text-base-content/60 backdrop-blur">
            No items match your filters.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDrag(null)}
          >
            <div className="space-y-3">
              <SortableContext
                items={rootIds}
                strategy={verticalListSortingStrategy}
              >
                {visibleRoots.map((node) => (
                  <ContainerSection
                    key={node.container.id}
                    node={node}
                    categoriesById={categoriesById}
                    filtering={filtered}
                    dndDisabled={dndDisabled}
                    onAddItem={(id) => openAddItem(id)}
                    onAddCube={openAddCube}
                    onEditContainer={openEditContainer}
                    onDeleteContainer={askDeleteContainer}
                    onEditItem={openEditItem}
                    onDeleteItem={removeItem}
                  />
                ))}
              </SortableContext>

              {tree.unassigned.length > 0 && (
                <UnassignedSection
                  tripId={tripId}
                  items={tree.unassigned}
                  categoriesById={categoriesById}
                  filtering={filtered}
                  dndDisabled={dndDisabled}
                  onEditItem={openEditItem}
                  onDeleteItem={removeItem}
                  onAddFull={() => openAddItem(null)}
                />
              )}

              {!filtered && (
                <button
                  onClick={openAddBag}
                  className="w-full rounded-3xl border-2 border-dashed border-base-300 py-3 text-sm font-medium text-base-content/55 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  ＋ Add bag
                </button>
              )}
            </div>

            <DragOverlay>
              {activeDrag ? (
                <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm font-medium text-base-content shadow-xl">
                  {activeDrag.label}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
      <SaveAsTemplate
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        tripId={tripId}
        tripName={trip.name}
      />
      <AiGenerateList
        open={showGenerate}
        onClose={() => setShowGenerate(false)}
        trip={trip}
        hasItems={items.length > 0}
      />
      <AuditSuggestions
        open={audit.open}
        onClose={() => setAudit((a) => ({ ...a, open: false }))}
        loading={audit.loading}
        suggestions={audit.suggestions}
        onAdd={addSuggestion}
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
