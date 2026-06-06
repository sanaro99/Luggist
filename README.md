# 🧳 Luggist

Luggist is a **packing tracker**. Build inventories of your travel items, assign
them to specific bags and packing cubes, and visually track your packing progress
with checklists and progress bars.

It's an installable, **offline-first PWA** — all data is stored locally on your
device, so there's no account to create and nothing to sync.

## Features

- **Trips → Bags → Cubes → Items** hierarchy. A trip holds bags; a bag can hold
  packing cubes; items are assigned to any bag or cube (or left unassigned).
- **Visual progress** — per-container "X / Y packed" counts plus an overall
  trip progress bar.
- **Categories & search** — tag items (Clothes, Electronics, Toiletries…),
  filter by category, and search items within a trip.
- **Local-first** — everything lives in IndexedDB. Works fully offline and is
  installable to your home screen.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Dexie.js](https://dexie.org) over IndexedDB (`dexie-react-hooks` `useLiveQuery`
  for reactive reads)
- A hand-written service worker (`public/sw.js`) + web app manifest
  (`app/manifest.ts`) for PWA / offline support

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint
node scripts/gen-icons.mjs   # regenerate PWA icons
```

> The service worker only registers in production builds, so use `npm run build &&
> npm run start` to exercise offline behavior.

## Project layout

```
app/                     Routes (home, /trips/[tripId]), layout, manifest, icons
components/              UI components (TripView, ContainerSection, forms, modals…)
lib/
  db.ts                 Dexie schema
  repo.ts               CRUD mutations
  progress.ts           progress + bag/cube tree helpers
  types.ts              domain types
  seed.ts               default categories + color palette
public/sw.js            service worker
scripts/gen-icons.mjs   PWA icon generator
```

## Data model

A single self-referential `containers` table models both bags and cubes: a bag has
`parentId === null`; a packing cube is a container whose `parentId` points at its
bag. Items reference the container they're packed in (or `null` when unassigned),
and an optional category. Categories are global and reused across trips.

## License

[GPL-3.0](./LICENSE)
