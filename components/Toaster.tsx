"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  icon: string;
}

interface ToastOptions {
  tone?: ToastTone;
  icon?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_ICON: Record<ToastTone, string> = {
  success: "✓",
  error: "⚠️",
  info: "✦",
};

const TONE_RING: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-error",
  info: "text-secondary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const tone = opts.tone ?? "success";
    const id = nextId.current++;
    setToasts((prev) => [
      ...prev,
      { id, message, tone, icon: opts.icon ?? DEFAULT_ICON[tone] },
    ]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, opts.duration ?? 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-pop pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full border border-base-300 bg-base-100/95 px-4 py-2.5 text-sm font-medium text-base-content shadow-xl backdrop-blur"
          >
            <span className={`text-base leading-none ${TONE_RING[t.tone]}`}>
              {t.icon}
            </span>
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast() function. Safe no-op if no provider is mounted. */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? { toast: () => {} };
}
