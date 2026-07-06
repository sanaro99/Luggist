"use client";

import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "./Modal";
import { useToast } from "./Toaster";
import { db } from "@/lib/db";
import { createTrip, updateTrip } from "@/lib/repo";
import { createTripFromTemplate } from "@/lib/templates";
import type { Trip } from "@/lib/types";

interface TripFormProps {
  open: boolean;
  onClose: () => void;
  trip?: Trip;
  onCreated?: (id: string) => void;
}

export default function TripForm(props: TripFormProps) {
  if (!props.open) return null;
  return <TripFormInner {...props} />;
}

function TripFormInner({ onClose, trip, onCreated }: TripFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(trip?.name ?? "");
  const [destination, setDestination] = useState(trip?.destination ?? "");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");
  const [notes, setNotes] = useState(trip?.notes ?? "");
  const [fromTemplateId, setFromTemplateId] = useState("");

  const templates = useLiveQuery(() =>
    db.templates.orderBy("createdAt").toArray(),
  );
  const showTemplatePicker = !trip && (templates?.length ?? 0) > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      destination: destination.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      notes: notes.trim() || undefined,
    };
    if (trip) {
      await updateTrip(trip.id, payload);
      toast("Trip updated");
    } else if (fromTemplateId) {
      const id = await createTripFromTemplate(fromTemplateId, payload);
      toast("Trip created from template", { icon: "📋" });
      if (id) onCreated?.(id);
    } else {
      const id = await createTrip(payload);
      toast("Trip created", { icon: "🧳" });
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={trip ? "Edit trip" : "New trip"}>
      <form onSubmit={submit} className="space-y-4">
        {showTemplatePicker && (
          <div>
            <label className="form-label" htmlFor="trip-template">
              Start from
            </label>
            <select
              id="trip-template"
              className="select select-bordered w-full"
              value={fromTemplateId}
              onChange={(e) => setFromTemplateId(e.target.value)}
            >
              <option value="">Blank trip</option>
              {templates!.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="form-label" htmlFor="trip-name">
            Trip name
          </label>
          <input
            id="trip-name"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Japan, two weeks"
            autoFocus
          />
        </div>
        <div>
          <label className="form-label" htmlFor="trip-dest">
            Destination{" "}
            <span className="font-normal text-base-content/40">(optional)</span>
          </label>
          <input
            id="trip-dest"
            className="input input-bordered w-full"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Tokyo"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="trip-start">
              Start
            </label>
            <input
              id="trip-start"
              type="date"
              className="input input-bordered w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="trip-end">
              End
            </label>
            <input
              id="trip-end"
              type="date"
              className="input input-bordered w-full"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor="trip-notes">
            Notes{" "}
            <span className="font-normal text-base-content/40">(optional)</span>
          </label>
          <textarea
            id="trip-notes"
            className="textarea textarea-bordered min-h-[72px] w-full resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember…"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={!name.trim()}
        >
          {trip ? "Save changes" : "Create trip"}
        </button>
      </form>
    </Modal>
  );
}
