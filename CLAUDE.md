# CLAUDE.md

Guidance for working in this repo. Read this first.

## What Luggist is

Luggist is an **offline-first packing-tracker PWA**: create trips, add bags and
packing cubes, assign items, and track packing progress. All data is local
(IndexedDB) — no accounts, no cloud sync. The one server-side piece is an
**optional AI gateway** (`app/api/ai`) powering the AI-assist features;
everything else runs in the browser, and the AI features degrade to offline
heuristics when no provider key is configured.

## How I want you to work (priorities)

These take precedence over convenience. When in doubt, follow them.

1. **Intuitive frontend, always.** The UX is the product. Favor clear,
   low-friction, mobile-first flows over feature density — never add UI the user
   has to learn. Stay visually consistent with the existing components and the
   shared classes in `app/globals.css`. If a screen feels confusing, that's a
   bug worth fixing before moving on.

2. **Keep the backend/data layer simple.** Choose the smallest design that
   works. Avoid premature abstraction, extra layers, and clever indirection.
   All DB access goes through `lib/repo.ts`; keep the schema minimal. If a
   feature seems to demand complex state or special-casing, step back and find a
   simpler shape before building it.

3. **Fix root causes, never symptoms.** No hardcoded values, no magic
   special-cases, no surface patches that just make an error message disappear.
   Diagnose *why* something breaks and fix the underlying cause. If you don't yet
   understand the root cause, keep investigating before changing code — explain
   the cause, then the fix.

4. **Commit and push frequently.** Work in small, logically-scoped commits with
   clear messages and push to `origin` often, so progress is never lost. Run
   `npm run lint` and `npm run build` before committing. Don't mix unrelated
   changes into one commit.

## Commands

- `npm run dev` — dev server at http://localhost:3000. Port 3000 is sometimes
  taken on this machine; use `PORT=3100 npm run dev` if it fails to bind.
- `npm run build` — production build (also runs the type-check).
- `npm run start` — serve the production build. Needed to test the service
  worker / offline behavior (the SW only registers in production).
- `npm run lint` — ESLint. `npx tsc --noEmit` — type-check only.
- `node scripts/gen-icons.mjs` — regenerate the PWA icons.
- **AI features** need a provider configured: copy `.env.example` → `.env.local`
  and set `AI_API_KEY` (default provider Mistral). Local Ollama works key-free
  (`AI_PROVIDER=ollama`). Without config, the app still runs — AI-assist falls
  back to offline heuristics.

## Architecture

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4.
  Persistence is Dexie over IndexedDB; reactive reads use
  `dexie-react-hooks` `useLiveQuery`.
- **Data model** (`lib/db.ts`, `lib/types.ts`): five tables — `trips`,
  `containers`, `items`, `categories`, `templates`. Bags and packing cubes share
  the self-referential `containers` table: a bag has `parentId === null`; a
  cube's `parentId` is its bag. Items reference a `containerId` (or `null` =
  unassigned) and an optional `categoryId`. Optional `Item.weight` and
  `Container.weightLimit` (kg) drive weight tracking. Categories are global,
  reused across trips. Bump the Dexie version (currently 3) when changing the
  schema; adding non-indexed optional fields needs no upgrade callback.
- **Mutations live only in `lib/repo.ts`** (and `lib/templates.ts` for template
  save/instantiate). UI components never write to Dexie directly.
- **Templates** (`lib/templates.ts`): a reusable list is one `templates` row
  holding a self-contained JSON snapshot — local `tempId`s, categories by *name*
  (resolved via `getOrCreateCategoryByName` on instantiation), no packed state.
  Built-in starters seeded by `ensureTemplatesSeeded` (called from `AppInit`).
  `applyTemplateData(tripId, data)` populates a trip from a `TemplateData`
  snapshot and is reused by the AI list generator (B1).
- **AI gateway** (`app/api/ai/route.ts`, `lib/ai/*`): one Node route, one
  `switch` over tasks (`generateList`, `audit`, `parseQuickAdd`, `categorize`).
  Provider config is **env-only** (`AI_PROVIDER` / `AI_MODEL` / `AI_BASE_URL` /
  `AI_API_KEY`; see `.env.example`), default Mistral. `lib/ai/chat.ts` dispatches
  to a client adapter; Mistral/OpenAI/DeepSeek/Ollama all share the
  `openai-compatible` adapter (official `openai` SDK with a swapped `baseURL`).
  Add a non-compatible provider (Anthropic, Gemini) by registering a new
  `AdapterId` + adapter — nothing else changes. `lib/ai/client.ts` is the only
  AI module a client component imports (it just `fetch`es `/api/ai`) and holds
  the offline heuristics (`parseQuickAddOffline`, `categorizeOffline`) so
  quick-add and auto-categorize keep working with no key/network.
- **Derived data** (`lib/progress.ts`): progress math + the bag/cube tree
  (`buildTree`, `pruneEmpty`). Progress is always computed, never stored.
- **Drag-and-drop** (`@dnd-kit`, `lib/dnd.ts`): one `DndContext` in `TripView`;
  items and containers are sortable, every container is a drop zone. Ordering
  persists through `sortOrder` via `setItemsOrder` / `reorderContainers`. DnD is
  disabled while a search/category filter is active.
- **Routes:** `app/page.tsx` → `components/TripsHome.tsx` (trips list);
  `app/trips/[tripId]/page.tsx` (awaits `params`) → `components/TripView.tsx`
  (the main packing screen, which orchestrates all the modals).

## Conventions & gotchas

- **Client-only data.** Anything touching Dexie must be a client component
  (`"use client"`). IndexedDB is browser-only, and `useLiveQuery` returns
  `undefined` on the server and first render — always render a loading state.
  Don't import `lib/db` into a server component.
- **IndexedDB doesn't index `null`.** Don't query by `parentId`/`containerId`;
  load a trip's rows by the indexed `tripId` and group in memory
  (`buildTree`). Per-trip datasets are small, so this is fine.
- **Modals & forms.** `Modal.tsx` renders via a portal. Form modals mount only
  while open (outer guard component + a `…Inner` that holds the hooks), so state
  initializes from props — never sync `setState` inside an effect (Next 16 lints
  that as an error: `react-hooks/set-state-in-effect`).
- **Styling.** The UI is built on **DaisyUI** classes (`btn btn-primary`,
  `input input-bordered`, `select select-bordered`, `textarea textarea-bordered`,
  `badge`, `card`, `form-label`) plus the shared patterns in `app/globals.css` —
  match the surrounding components. Both light and dark themes ship (toggled via
  `ThemeToggle`, persisted in `localStorage`).
- **PWA.** Manifest is `app/manifest.ts`; the service worker is `public/sw.js`
  and registers only in production (`ServiceWorkerRegister.tsx`). Bump the
  `CACHE` version in `sw.js` when you change cached assets.
- **Package name** must stay lowercase. The repo folder is `Luggist`, so
  scaffolding tools that derive the npm name from the folder will reject it.

## Git

- Remote: `origin` → https://github.com/sanaro99/Luggist. Default branch `main`.
- Commit small and often, push regularly (priority #4). End commit messages with
  the required `Co-Authored-By` trailer.

@AGENTS.md
