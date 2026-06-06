import Link from "next/link";
import ProgressBar from "./ProgressBar";
import { formatDateRange } from "@/lib/format";
import type { Trip } from "@/lib/types";

interface TripCardProps {
  trip: Trip;
  packed: number;
  total: number;
}

export default function TripCard({ trip, packed, total }: TripCardProps) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const done = total > 0 && packed === total;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="card block p-5 transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{trip.name}</h3>
          {trip.destination && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              📍 {trip.destination}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-sm font-semibold ${
            done ? "text-emerald-600" : "text-teal-600"
          }`}
        >
          {total === 0 ? "—" : done ? "Packed ✓" : `${pct}%`}
        </span>
      </div>
      {dates && <p className="mt-1 text-xs text-slate-400">{dates}</p>}
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar packed={packed} total={total} className="flex-1" />
        <span className="whitespace-nowrap text-xs text-slate-500">
          {total === 0 ? "No items" : `${packed}/${total}`}
        </span>
      </div>
    </Link>
  );
}
