"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { ...toast, id }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const success = useCallback(
    (message: string) => push({ kind: "success", message }),
    [push],
  );
  const error = useCallback(
    (message: string) => push({ kind: "error", message }),
    [push],
  );
  const info = useCallback(
    (message: string) => push({ kind: "info", message }),
    [push],
  );
  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, push, success, error, info, dismiss }}
    >
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const colors: Record<Toast["kind"], string> = {
    success: "border-emerald-400/40 bg-emerald-400/[0.07] text-emerald-200",
    error: "border-red-400/40 bg-red-400/[0.07] text-red-200",
    info: "border-white/20 bg-white/[0.04] text-zinc-200",
  };

  return (
    <div
      className={`border rounded-xl px-4 py-3 backdrop-blur transition-all duration-200 ${colors[toast.kind]} ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-sm flex-1">{toast.message}</span>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-xs opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
