# Luggist — Product Requirements Document

**Status:** Living document · **Last updated:** 2026-06-08
**Owner:** Sanchit Arora · **Repo:** https://github.com/sanaro99/Luggist

---

## 1. Overview

**Luggist is an offline-first packing-tracker PWA.** You create a trip, add the
bags and packing cubes you'll travel with, fill them with items, and track your
packing progress as you go — checking things off until everything reads 100%.

Everything lives locally in the browser (IndexedDB). There is **no backend, no
account, and no network dependency** once the app is loaded. It installs to the
home screen like a native app and works on a plane with the Wi-Fi off.

### One-line pitch
> The packing checklist that actually maps to your bags — fast, offline, and
> satisfying to finish.

---

## 2. Problem & Motivation

People pack the same way every trip and forget the same things every trip. The
tools they reach for are a poor fit:

- **Notes apps / paper lists** are flat. They don't model "what goes in which
  bag," so you can't tell at a glance whether the carry-on is done.
- **Generic to-do apps** carry overhead (accounts, sync, projects) and aren't
  built around the repeatable, structured nature of a packing list.
- **Most travel-packing apps** require sign-up, push a backend, and bury the
  core flow under recommendations and ads.

Luggist's bet: the job is small and structured enough to do **entirely on the
device**, with a UX so frictionless it beats a paper list on the metric that
matters — *did you actually pack everything?*

---

## 3. Goals & Non-Goals

### Goals
1. Let a user go from "new trip" to "tracking a real packing list" in under a
   minute, on a phone.
2. Model the physical reality of packing: items live inside **bags** and
   **packing cubes**, and progress rolls up that hierarchy.
3. Make packing feel **fast and rewarding** — bulk actions, quick-add,
   drag-to-organize, and a celebration at 100%.
4. Be **reliably offline**. Installable PWA; no data loss; no spinner waiting on
   a server.
5. Make repeat trips trivial via **reusable templates**.

### Non-Goals (explicitly out of scope)
- **No accounts, no cloud sync, no multi-device.** Data is per-browser-profile.
- **No backend / API.** All logic is client-side.
- **No collaboration / sharing** of live lists between people.
- **No weight tracking, no duplicate-trip, no backup export/import** *(considered
  and deliberately deferred — see §11 Roadmap).*
- **Not a travel-booking or itinerary app.** Scope ends at packing.

---

## 4. Target Users

| Persona | Need | How Luggist serves it |
|---|---|---|
| **The frequent flyer** | Pack the same kit every trip without re-thinking it | Save a trip as a template; spin up a new trip from it in seconds |
| **The anxious packer** | Confidence that nothing was forgotten | Per-bag and overall progress; everything must hit 100% |
| **The multi-bag traveler** (family/gear-heavy) | Know what's in which bag/cube | Bags → cubes → items hierarchy with per-container progress |
| **The minimalist** | Zero friction, zero accounts | Open app, add items, done — fully offline |

**Primary context is mobile.** Desktop is fully supported but the design target
is one-handed phone use the night before a trip.

---

## 5. Core Concepts & Data Model

The entire app is built on **five tables** in IndexedDB (via Dexie). Schema is
intentionally minimal; all mutations route through `lib/repo.ts` and
`lib/templates.ts`.

```
Trip ─┬─< Container (bag,  parentId = null)
      │        └─< Container (cube, parentId = bag.id)
      └─< Item (containerId → bag/cube, or null = unassigned)
                  └─ categoryId → Category (global, cross-trip)

Template ─ self-contained JSON snapshot (no live IDs; categories by name)
```

- **Trip** — name, optional destination, start/end dates, notes. Timestamps for
  sort/recency.
- **Container** — one self-referential table for both **bags** and **cubes**. A
  bag has `parentId === null`; a cube's `parentId` is its bag. Has an optional
  color and a `sortOrder` for manual ordering.
- **Item** — belongs to a trip, references a container (or `null` =
  *unassigned*) and an optional category. Has `quantity`, a `packed` boolean,
  optional notes, and `sortOrder`.
- **Category** — **global and reused across trips** (e.g. Clothes, Toiletries,
  Electronics, Documents). Color-coded.
- **Template** — a reusable packing list stored as a self-contained snapshot:
  containers use local temp IDs, items reference categories *by name* (resolved
  or created on instantiation), and **no packed state** is carried over.

**Derived, never stored:** packing progress and the bag/cube tree are always
*computed* from items (`lib/progress.ts`), so they can never drift out of sync.

---

## 6. Features

### 6.1 Shipped — Core
- **Trips list (home).** Create, edit, delete trips. Each trip card shows
  destination, dates, a live progress bar, and a **countdown** to the start date.
- **Trip view.** The main packing screen: header (destination, dates, notes),
  overall progress, the bag/cube/item tree, and all management actions.
- **Bags & packing cubes.** Add bags to a trip; add cubes inside bags. Rename,
  recolor, reorder, delete. Deleting a container moves its items back to
  *unassigned* rather than destroying them.
- **Items.** Add with name, quantity, category, target container, and notes.
  Edit, delete, and **check off as packed**. Loose items live in an
  **Unassigned** section until placed.
- **Quick-add.** Inline add-item input on each bag/cube so you can fill a
  container without opening a modal.
- **Bulk pack / unpack.** Pack or unpack every item in a container in one tap.
- **Progress everywhere.** Overall trip progress + per-bag and per-cube progress,
  always derived from item state.
- **Categories.** Global, color-coded, managed in one place; reused across all
  trips.
- **Templates.** Save any trip as a reusable template; create a new trip from a
  template. Ships with built-in starters: **Weekend getaway**, **Beach
  vacation**, **Business trip**.
- **Drag-and-drop organizing** (`@dnd-kit`). Reorder items and containers, and
  drag items between containers. Order persists via `sortOrder`. *(Disabled
  while a search/category filter or non-manual sort is active, since the visible
  order isn't the stored order.)*

### 6.2 Shipped — Recent "Sunset Voyage" revamp
- **Refreshed visual identity** on DaisyUI 5: warm coral/amber/teal "Sunset"
  palette, rounded playful surfaces, display + body type pairing (Fraunces /
  Outfit), and a soft mesh background.
- **Light & dark themes** with a **theme toggle** (respects system preference;
  DOM-driven so it survives reloads).
- **Trip dashboard + countdown.** At-a-glance state per trip, days-until-trip
  countdown badges.
- **Smart filters & sort.** Filter items by category and by packed/unpacked;
  sort the list; search by name.
- **Polish:** richer empty states, **toast notifications** for actions, and a
  **100%-packed celebration** (confetti) when a trip is fully packed.

### 6.3 In progress / known issues
- **Horizontal overflow on desktop when expanding a bag** — being fixed
  structurally (let the item-row category label shrink/truncate within its flex
  row; no hardcoded caps).
- **Trip-page options dropdown renders behind other elements** — root cause is a
  `backdrop-blur` stacking context on cards trapping the absolutely-positioned
  menu; fix is to render the menu in a portal to `document.body` (same pattern as
  `Modal.tsx`).

---

## 7. Key User Flows

**Create a trip and start packing**
1. Home → **New trip** → name (+ optional destination, dates, notes).
2. Add a bag → add cubes if needed.
3. Quick-add items into each container (or add via modal with category/quantity).
4. Check items off; watch per-bag and overall progress climb.
5. Hit 100% → celebration.

**Reuse a packing list**
1. From a finished/representative trip → **Save as template**.
2. Next trip → **New from template** → pick template → name the trip.
3. New trip is created with all bags/cubes/items, **all unpacked**.

**Organize on the fly**
- Drag an item from *Unassigned* into a cube; reorder bags; bulk-pack a cube
  that's fully handled.

---

## 8. Design Principles (the product bar)

These come straight from the project's working priorities and are
non-negotiable for any new work:

1. **Intuitive frontend, always.** The UX *is* the product. Favor clear,
   low-friction, mobile-first flows over feature density. Never add UI the user
   has to learn. If a screen feels confusing, that's a bug to fix before moving
   on.
2. **Keep the data layer simple.** Smallest design that works; minimal schema;
   all DB access through `lib/repo.ts`. No premature abstraction.
3. **Fix root causes, not symptoms.** No hardcoded values, no magic
   special-cases, no surface patches. Diagnose *why*, then fix.
4. **Visual consistency.** Reuse the shared component classes
   (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.label`, `.card`,
   and the Sunset helpers in `app/globals.css`) instead of one-off utility
   strings.

---

## 9. Technical Architecture & Constraints

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
  DaisyUI 5. Persistence: **Dexie over IndexedDB**; reactive reads via
  `dexie-react-hooks` `useLiveQuery`.
- **Client-only data.** Anything touching Dexie is a client component
  (`"use client"`); `useLiveQuery` returns `undefined` on the server/first
  render, so every data view renders a loading state.
- **IndexedDB doesn't index `null`.** Don't query by `parentId`/`containerId`;
  load a trip's rows by indexed `tripId` and group in memory (`buildTree`).
  Per-trip datasets are small, so this is fine.
- **Mutations are centralized** in `lib/repo.ts` (+ `lib/templates.ts`). UI never
  writes to Dexie directly. Bump the Dexie version when changing schema
  (currently v2).
- **PWA:** manifest in `app/manifest.ts`; service worker in `public/sw.js`
  (registers in production only). Bump the `CACHE` version when cached assets
  change.
- **Routes:** `/` → `TripsHome`; `/trips/[tripId]` → `TripView` (orchestrates all
  modals). Modals render via a portal and mount only while open.

### Constraints / risks
- **Single-device, single-profile.** Clearing browser data or switching
  browsers loses the data (no sync, by design). This is the main user-facing
  risk and the strongest argument for an eventual **export/import** safety net.
- **No server validation or analytics** — product decisions rely on dogfooding
  and qualitative feedback, not telemetry.

---

## 10. Success Metrics

Given there's no backend telemetry, success is judged by **task success and
feel**, validated through use and feedback:

- **Time-to-first-item:** new trip → first item added in **< 60s** on mobile.
- **Completion:** a high share of started trips reach **100% packed** before the
  trip date (the core promise — nothing forgotten).
- **Reuse:** templates are used for repeat trips rather than rebuilding lists.
- **Zero data-loss incidents** from app bugs (deletes preserve inventory, schema
  migrations are additive).
- **Offline reliability:** full functionality with the network disabled after
  first load.
- **Qualitative:** the app feels *fun and fast*, not like a chore.

---

## 11. Roadmap & Open Questions

### Near-term
- Land the two in-flight fixes (desktop overflow on bag-expand; dropdown
  stacking) **structurally**, no hardcoding.
- Continue UX polish consistent with the Sunset direction.

### Considered, deliberately deferred
- **Backup export / import** (JSON) — the natural answer to the single-device
  data-loss risk; highest-value next safety feature.
- **Duplicate trip** — quick win adjacent to templates.
- **Weight tracking** — per-item/per-bag weight with limits.

### Open questions
- Do we add an **export/import** safety net before broader release, given data
  lives only on one device?
- Should **categories** ever become per-trip, or stay global? (Currently global
  for simplicity and cross-trip reuse.)
- How far should **drag-and-drop** extend (e.g. moving items into cubes across
  bags) before it adds more complexity than value on mobile?

---

*This PRD reflects the product as actually built (five-table local model, the
shipped feature set, and the recent DaisyUI "Sunset Voyage" revamp). Keep it in
sync as scope changes — it should describe what Luggist is, not what any single
release happened to contain.*
