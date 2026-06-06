# CLAUDE.md

Guidance for working in this repo. Read this first.

## What Luggist is

Luggist is an **offline-first packing-tracker PWA**: create trips, add bags and
packing cubes, assign items, and track packing progress. All data is local
(IndexedDB) — no backend, no accounts.

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

## Architecture

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4.
  Persistence is Dexie over IndexedDB; reactive reads use
  `dexie-react-hooks` `useLiveQuery`.
- **Data model** (`lib/db.ts`, `lib/types.ts`): four tables — `trips`,
  `containers`, `items`, `categories`. Bags and packing cubes share the
  self-referential `containers` table: a bag has `parentId === null`; a cube's
  `parentId` is its bag. Items reference a `containerId` (or `null` =
  unassigned) and an optional `categoryId`. Categories are global, reused across
  trips.
- **Mutations live only in `lib/repo.ts`.** UI components never write to Dexie
  directly.
- **Derived data** (`lib/progress.ts`): progress math + the bag/cube tree
  (`buildTree`). Progress is always computed, never stored.
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
- **Styling.** Reuse the component classes in `app/globals.css`
  (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.label`, `.card`).
  Add new shared patterns there instead of repeating utility strings. Accent is
  teal; the app is light-mode only.
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
