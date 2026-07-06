"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { tripCountdown } from "@/lib/format";
import TripCard from "./TripCard";
import TripForm from "./TripForm";
import ManageTemplates from "./ManageTemplates";
import SearchBar from "./SearchBar";

function StatCard({
  icon,
  value,
  label,
  sub,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-base-300/60 bg-base-100/80 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs font-medium text-base-content/55">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className={`font-display mt-1 truncate text-xl font-semibold ${accent}`}>
        {value}
      </div>
      {sub && <div className="truncate text-xs text-base-content/45">{sub}</div>}
    </div>
  );
}

export default function TripsHome() {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [search, setSearch] = useState("");

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

  const stats = useMemo(() => {
    const all = items ?? [];
    const total = all.length;
    const packed = all.filter((i) => i.packed).length;
    const pct = total === 0 ? 0 : Math.round((packed / total) * 100);

    const todayISO = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const next = (trips ?? [])
      .filter((t) => t.startDate && t.startDate >= todayISO)
      .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))[0];

    return { total, packed, pct, next };
  }, [items, trips]);

  const query = search.trim().toLowerCase();
  const filteredTrips = useMemo(() => {
    if (!query) return trips ?? [];
    return (trips ?? []).filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.destination ?? "").toLowerCase().includes(query),
    );
  }, [trips, query]);

  const loading = trips === undefined || items === undefined;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-base-content">
            Your trips
          </h1>
          <p className="text-sm text-base-content/60">
            Plan, pack, and track every bag. ✦
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={() => setShowTemplates(true)}>
            📋 Templates
          </button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            <span className="text-base leading-none">＋</span> New trip
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="card animate-rise mt-2 border border-base-300/70 bg-base-100/80 backdrop-blur">
          <div className="card-body items-center px-6 py-16 text-center">
            <span className="animate-float text-6xl" aria-hidden>
              🧳
            </span>
            <h2 className="font-display mt-4 text-xl font-semibold text-base-content">
              Let&apos;s pack something
            </h2>
            <p className="mt-1 max-w-xs text-sm text-base-content/60">
              Create your first trip to start building a packing list — or kick
              off from a ready-made template.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>
                ＋ Create a trip
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowTemplates(true)}
              >
                Browse templates
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Dashboard */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatCard
              icon="🧳"
              label="Trips"
              value={String(trips.length)}
              accent="text-base-content"
            />
            <StatCard
              icon="✅"
              label="Packed"
              value={`${stats.pct}%`}
              sub={`${stats.packed}/${stats.total} items`}
              accent="text-gradient-sunset"
            />
            <StatCard
              icon="✈️"
              label="Next trip"
              value={
                stats.next
                  ? (tripCountdown(stats.next.startDate, stats.next.endDate)
                      ?.label ?? "—")
                  : "—"
              }
              sub={stats.next ? stats.next.name : "Nothing scheduled"}
              accent="text-secondary"
            />
          </div>

          {trips.length > 1 && (
            <div className="mb-4">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search trips…"
              />
            </div>
          )}

          {filteredTrips.length === 0 ? (
            <div className="card border border-base-300/70 bg-base-100/70 px-6 py-12 text-center text-sm text-base-content/60">
              No trips match “{search}”.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTrips.map((trip, i) => {
                const c = counts.get(trip.id) ?? { packed: 0, total: 0 };
                return (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    packed={c.packed}
                    total={c.total}
                    index={i}
                  />
                );
              })}
            </div>
          )}
        </>
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
