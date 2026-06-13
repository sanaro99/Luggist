"use client";

import { useSyncExternalStore } from "react";

const LIGHT = "sunset";
const DARK = "sunsetdark";

// The active theme lives on <html data-theme>. We read it as an external store
// (via useSyncExternalStore) so there's no setState-in-effect and no hydration
// mismatch — the value is always sourced from the DOM the init script set.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): string {
  return document.documentElement.dataset.theme ?? LIGHT;
}

function getServerSnapshot(): string {
  return LIGHT;
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === DARK;

  const toggle = () => {
    const next = isDark ? LIGHT : DARK;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("luggist-theme", next);
    } catch {
      /* ignore storage errors */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="btn btn-circle btn-ghost text-lg"
    >
      <span
        key={theme}
        className="animate-pop inline-block"
        aria-hidden
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
