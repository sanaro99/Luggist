"use client";

import { useSyncExternalStore } from "react";

// Connectivity read as an external store (same pattern as ThemeToggle):
// no setState-in-effect, no hydration mismatch.
function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * A quiet "Offline" pill for the header. Offline is a fully supported state —
 * the copy reassures rather than warns. Renders nothing while online.
 */
export default function OfflineBadge() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (online) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-base-200 px-2.5 py-1 text-xs font-medium text-base-content/60"
      title="You're offline — everything still works. Changes are saved on this device."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      Offline
    </span>
  );
}
