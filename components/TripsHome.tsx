"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import TripCard from "./TripCard";
import TripForm from "./TripForm";
import ManageTemplates from "./ManageTemplates";

export default function TripsHome() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const trips = useLiveQuery(() =>
    db.trips.orderBy("updatedAt").reverse().toArray(),
  );
  const items = useLiveQuery(() => db.items.toArray());

  const counts = useMemo(() => {
    const map = new Map<string, { packed: number; total: number }>();
    for (const item of items ?? []) {
      const entry = map.get(item.tripId) ?? { packed: 0, total: 0 };
      entry.total += 1;
      if (item.packed) entry.packed += 1;
      map.set(item.tripId, entry);
    }
    return map;
  }, [items]);

  const loading = trips === undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Your trips
          </h1>
          <p className="text-sm text-slate-500">
            Plan, pack, and track every bag.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary"
            onClick={() => setShowTemplates(true)}
          >
            Templates
          </button>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <span className="text-base leading-none">＋</span> New trip
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="text-4xl" aria-hidden>
            🧳
          </span>
          <h2 className="mt-3 font-semibold text-slate-900">No trips yet</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Create your first trip to start building a packing list.
          </p>
          <button className="btn-primary mt-5" onClick={() => setShowNew(true)}>
            Create a trip
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map((trip) => {
            const c = counts.get(trip.id) ?? { packed: 0, total: 0 };
            return (
              <TripCard
                key={trip.id}
                trip={trip}
                packed={c.packed}
                total={c.total}
              />
            );
          })}
        </div>
      )}

      <TripForm
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(id) => router.push(`/trips/${id}`)}
      />
      <ManageTemplates
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
      />
    </div>
  );
}
