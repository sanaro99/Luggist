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
