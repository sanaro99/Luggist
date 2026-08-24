"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface MenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: ReactNode;
  /** Draws a hairline above this action, opening a new group. */
  startsGroup?: boolean;
}

interface MenuProps {
  actions: MenuAction[];
  label?: ReactNode;
  align?: "left" | "right";
  ariaLabel?: string;
}

/**
 * Where the dropdown sits, in viewport coordinates. The panel is portalled to
 * <body> and positioned `fixed`, because the cards it opens from use
 * `backdrop-filter` — which both creates a stacking context (so a local z-index
 * can't lift the panel above later siblings) and acts as a containing block for
 * fixed children (so an in-card overlay can't cover the screen).
 */
interface Pos {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight: number;
}

const MENU_WIDTH = 224;
const ROW_HEIGHT = 38;
const GROUP_GAP = 9;
const PANEL_PADDING = 12;
const GAP = 6;
const EDGE = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Estimates the panel height from the action list rather than measuring the
 * rendered node, so the position is known before the first paint (no
 * measure-then-setState pass).
 */
function estimateHeight(actions: MenuAction[]) {
  const groups = actions.filter((a) => a.startsGroup).length;
  return actions.length * ROW_HEIGHT + groups * GROUP_GAP + PANEL_PADDING;
}

function computePos(rect: DOMRect, actions: MenuAction[], align: "left" | "right"): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const height = estimateHeight(actions);
  const spaceBelow = vh - rect.bottom - GAP - EDGE;
  const spaceAbove = rect.top - GAP - EDGE;
  const flip = spaceBelow < height && spaceAbove > spaceBelow;

  const horizontal =
    align === "right"
      ? { right: clamp(vw - rect.right, EDGE, vw - MENU_WIDTH - EDGE) }
      : { left: clamp(rect.left, EDGE, vw - MENU_WIDTH - EDGE) };

  return flip
    ? { bottom: vh - rect.top + GAP, maxHeight: spaceAbove, ...horizontal }
    : { top: rect.bottom + GAP, maxHeight: spaceBelow, ...horizontal };
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
  // A single piece of state: the panel is open exactly when it has a position.
  const [pos, setPos] = useState<Pos | null>(null);
  const open = pos !== null;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = (refocus = false) => {
    setPos(null);
    if (refocus) triggerRef.current?.focus();
  };

  // Escape closes and hands focus back; scrolling or resizing invalidates the
  // anchor, so the panel closes rather than drifting away from its trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onReflow = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open]);

  return (
    <div className="shrink-0">
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
          if (open) {
            close();
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          setPos(computePos(rect, actions, align));
        }}
      >
        {label ?? <DotsIcon />}
      </button>
      {pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[90]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
            />
            <div
              role="menu"
              style={{
                top: pos.top,
                bottom: pos.bottom,
                left: pos.left,
                right: pos.right,
                width: MENU_WIDTH,
                maxHeight: pos.maxHeight,
              }}
              className="animate-pop fixed z-[91] overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-xl"
            >
              {actions.map((action, i) => (
                <div key={i}>
                  {action.startsGroup && i > 0 && (
                    <div className="my-1 h-px bg-base-300/70" aria-hidden />
                  )}
                  <button
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      close();
                      action.onClick();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                      action.danger
                        ? "text-error hover:bg-error/10"
                        : "text-base-content hover:bg-base-200"
                    }`}
                  >
                    {action.icon && (
                      <span className="w-4 shrink-0 text-center text-base-content/50">
                        {action.icon}
                      </span>
                    )}
                    <span className="truncate">{action.label}</span>
                  </button>
                </div>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
