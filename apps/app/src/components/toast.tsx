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
      <div className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2">
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

  const borderByKind: Record<Toast["kind"], string> = {
    success: "border-success text-success",
    error: "border-error text-error",
    info: "border-rule-strong text-text",
  };
  const dotByKind: Record<Toast["kind"], string> = {
    success: "text-success",
    error: "text-error",
    info: "text-accent",
  };
  const labelByKind: Record<Toast["kind"], string> = {
    success: "ok",
    error: "err",
    info: "info",
  };

  return (
    <div
      className={`border bg-surface px-4 py-3 font-mono text-[12px] ${borderByKind[toast.kind]} ${
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      } transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <span className={`shrink-0 ${dotByKind[toast.kind]}`}>●</span>
        <span className="mr-2 shrink-0 uppercase tracking-[0.12em] text-muted">
          {labelByKind[toast.kind]}
        </span>
        <span className="flex-1 text-text">{toast.message}</span>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-[11px] text-muted hover:text-text"
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
