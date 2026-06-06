"use client";

import { useState, type ReactNode } from "react";

export interface MenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
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

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-ghost"
        aria-label={ariaLabel}
        aria-haspopup="menu"
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
            className={`absolute z-50 mt-1 min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${
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
                className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                  action.danger ? "text-red-600" : "text-slate-700"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
