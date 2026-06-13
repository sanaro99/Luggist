"use client";

import { useState } from "react";
import Modal from "./Modal";
import { useToast } from "./Toaster";
import { aiGenerateList } from "@/lib/ai/client";
import { applyTemplateData } from "@/lib/templates";
import type { Trip } from "@/lib/types";

interface AiGenerateListProps {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  hasItems: boolean;
}

/** Inclusive day count between two ISO dates, or undefined if not both set. */
function durationDays(start?: string, end?: string): number | undefined {
  if (!start || !end) return undefined;
  const ms =
    new Date(`${end}T00:00:00`).getTime() -
    new Date(`${start}T00:00:00`).getTime();
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  return Math.round(ms / 86_400_000) + 1;
}

export default function AiGenerateList(props: AiGenerateListProps) {
  // Mount fresh each open so state initializes from props.
  if (!props.open) return null;
  return <AiGenerateListInner {...props} />;
}

function AiGenerateListInner({ onClose, trip, hasItems }: AiGenerateListProps) {
  const { toast } = useToast();
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = durationDays(trip.startDate, trip.endDate);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const notes = [trip.notes, extra.trim()].filter(Boolean).join(" ");
    const res = await aiGenerateList({
      destination: trip.destination,
      durationDays: days,
      notes: notes || undefined,
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    await applyTemplateData(trip.id, res.data);
    const n = res.data.items.length;
    toast(`Added ${n} ${n === 1 ? "item" : "items"}`, { icon: "✨" });
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Generate with AI"
      subtitle="Build a packing list from your trip"
    >
      <div className="space-y-4">
        <p className="text-sm text-base-content/60">
          We&apos;ll suggest bags and items based on{" "}
          {trip.destination ? (
            <>
              your trip to <b>{trip.destination}</b>
            </>
          ) : (
            "your trip"
          )}
          {days ? (
            <>
              {" "}
              for <b>{days} days</b>
            </>
          ) : null}
          . Add anything else worth knowing:
        </p>
        <textarea
          className="textarea textarea-bordered min-h-[72px] w-full resize-y"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="e.g. business meetings + hiking, cold weather, carry-on only"
          disabled={busy}
        />
        {hasItems && (
          <p className="rounded-xl bg-base-200/60 p-3 text-xs text-base-content/60">
            This adds to your current list — it won&apos;t remove anything.
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-error/10 p-3 text-xs text-error">{error}</p>
        )}
        <button
          onClick={generate}
          className="btn btn-primary w-full"
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="loading loading-spinner loading-sm" /> Generating…
            </>
          ) : (
            "✨ Generate list"
          )}
        </button>
      </div>
    </Modal>
  );
}
