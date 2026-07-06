/** Formats an optional start/end ISO date (yyyy-mm-dd) range for display. */
export function formatDateRange(start?: string, end?: string): string | null {
  if (!start && !end) return null;
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start || end) as string);
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

/** Formats a weight in kg, trimming trailing zeros (e.g. 1.5, 2, 0.25). */
export function formatKg(kg: number): string {
  return `${Number(kg.toFixed(2))} kg`;
}

/* ------------------------------ Countdown ----------------------------- */

export type CountdownTone = "soon" | "upcoming" | "today" | "ongoing" | "past";

export interface Countdown {
  label: string;
  tone: CountdownTone;
}

/** Whole days from today (local midnight) to the given ISO date. */
function daysFromToday(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * A friendly countdown for a trip based on its start/end dates. Returns null
 * when the trip has no dates to count down to.
 */
export function tripCountdown(start?: string, end?: string): Countdown | null {
  if (!start && !end) return null;

  if (start) {
    const d = daysFromToday(start);
    if (d > 0) {
      const label =
        d === 1 ? "Tomorrow" : d <= 14 ? `in ${d} days` : `in ${d} days`;
      return { label, tone: d <= 3 ? "soon" : "upcoming" };
    }
    if (d === 0) return { label: "Today!", tone: "today" };
    // Trip has started — is it still ongoing?
    if (end && daysFromToday(end) >= 0) {
      return { label: "Ongoing", tone: "ongoing" };
    }
    return { label: "Wrapped up", tone: "past" };
  }

  // Only an end date is set.
  const d = daysFromToday(end!);
  if (d > 0) return { label: `ends in ${d}d`, tone: d <= 3 ? "soon" : "upcoming" };
  if (d === 0) return { label: "Ends today", tone: "today" };
  return { label: "Wrapped up", tone: "past" };
}
