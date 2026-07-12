"use client";

import { useEffect, useState } from "react";

// Chromium's install-prompt event; not in the standard TS lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A small "Install" button that appears in the header when the browser offers
 * to install the PWA. Renders nothing when installation isn't available
 * (already installed, unsupported browser, or not yet offered).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const install = async () => {
    const event = deferred;
    // A prompt event is single-use; hide the button until the browser offers again.
    setDeferred(null);
    await event.prompt();
  };

  return (
    <button
      type="button"
      onClick={install}
      className="btn btn-ghost btn-sm shrink-0 gap-1.5 rounded-full text-base-content/70"
      title="Install Luggist on this device"
    >
      <DownloadIcon />
      <span className="hidden sm:inline">Install</span>
    </button>
  );
}
