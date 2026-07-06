import Link from "next/link";
import { ProgressRing } from "./ProgressBar";
import CountdownBadge from "./CountdownBadge";
import { formatDateRange } from "@/lib/format";
import type { Trip } from "@/lib/types";

interface TripCardProps {
  trip: Trip;
  packed: number;
  total: number;
  index?: number;
}

export default function TripCard({ trip, packed, total, index = 0 }: TripCardProps) {
  const dates = formatDateRange(trip.startDate, trip.endDate);
  const done = total > 0 && packed === total;

  return (
    <Link
      href={`/trips/${trip.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      className="card animate-rise group border border-base-300/70 bg-base-100/90 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="card-body gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display truncate text-lg font-semibold text-base-content">
              {trip.name}
            </h3>
            {trip.destination && (
              <p className="mt-0.5 truncate text-sm text-base-content/60">
                📍 {trip.destination}
              </p>
            )}
            {dates && (
              <p className="mt-1 text-xs text-base-content/45">{dates}</p>
            )}
          </div>
          <ProgressRing packed={packed} total={total} size="3.25rem" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <CountdownBadge start={trip.startDate} end={trip.endDate} />
          <span
            className={`ml-auto text-xs font-medium ${
              done ? "text-success" : "text-base-content/55"
            }`}
          >
            {total === 0
              ? "No items yet"
              : done
                ? "All packed 🎉"
                : `${packed}/${total} packed`}
          </span>
        </div>
      </div>
    </Link>
  );
}
