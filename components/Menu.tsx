"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: ReactNode;
}

interface MenuProps {
  actions: MenuAction[];
  label?: ReactNode;
  align?: "left" | "right";
  ariaLabel?: string;
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <circle cx="10" cy="4" r="1.6" />
      <circle cx="10" cy="10" r="1.6" />
      <circle cx="10" cy="16" r="1.6" />
    </svg>
  );
}

export default function Menu({
  actions,
  label,
  align = "right",
  ariaLabel = "Open menu",
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and hands focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-circle btn-ghost btn-sm text-base-content/60"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {label ?? <DotsIcon />}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            role="menu"
            className={`animate-pop absolute z-50 mt-1 min-w-[180px] overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {actions.map((action, i) => (
              <button
                key={i}
                role="menuitem"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick();
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  action.danger
                    ? "text-error hover:bg-error/10"
                    : "text-base-content hover:bg-base-200"
                }`}
              >
                {action.icon && (
                  <span className="shrink-0 text-base-content/50">
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
