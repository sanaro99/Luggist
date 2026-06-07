"use client";

import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Modal from "./Modal";
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
    } else if (fromTemplateId) {
      const id = await createTripFromTemplate(fromTemplateId, payload);
      if (id) onCreated?.(id);
    } else {
      const id = await createTrip(payload);
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={trip ? "Edit trip" : "New trip"}>
      <form onSubmit={submit} className="space-y-4">
        {showTemplatePicker && (
          <div>
            <label className="label" htmlFor="trip-template">
              Start from
            </label>
            <select
              id="trip-template"
              className="input"
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
          <label className="label" htmlFor="trip-name">
            Trip name
          </label>
          <input
            id="trip-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Japan, two weeks"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="trip-dest">
            Destination <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="trip-dest"
            className="input"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Tokyo"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="trip-start">
              Start
            </label>
            <input
              id="trip-start"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="trip-end">
              End
            </label>
            <input
              id="trip-end"
              type="date"
              className="input"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="trip-notes">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="trip-notes"
            className="input min-h-[72px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember…"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
          {trip ? "Save changes" : "Create trip"}
        </button>
      </form>
    </Modal>
  );
}
