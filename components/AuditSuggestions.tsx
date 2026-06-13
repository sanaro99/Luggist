"use client";

import Modal from "./Modal";
import type { AuditSuggestion } from "@/lib/ai/client";

interface AuditSuggestionsProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  suggestions: AuditSuggestion[];
  onAdd: (s: AuditSuggestion) => void;
}

/**
 * Presentational chips for the "What am I forgetting?" audit. The parent owns
 * the AI fetch (so no async state-setting effects live here) and removes a
 * suggestion from `suggestions` once it's added.
 */
export default function AuditSuggestions({
  open,
  onClose,
  loading,
  suggestions,
  onAdd,
}: AuditSuggestionsProps) {
  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="What am I forgetting?"
      subtitle="Tap anything you still need"
    >
      {loading ? (
        <div className="flex items-center gap-3 py-6 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-sm" />
          Thinking about your trip…
        </div>
      ) : suggestions.length === 0 ? (
        <p className="py-6 text-center text-sm text-base-content/60">
          Nothing to add — your list looks thorough! 🎉
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.name}
              onClick={() => onAdd(s)}
              className="btn btn-sm h-auto rounded-full border-base-300 bg-base-100 py-1.5 font-normal hover:border-primary hover:text-primary"
            >
              <span aria-hidden>＋</span>
              <span>{s.name}</span>
              {s.categoryName && (
                <span className="text-xs text-base-content/40">
                  {s.categoryName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
