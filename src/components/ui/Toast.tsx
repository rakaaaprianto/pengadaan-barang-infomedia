"use client";

import React, { createContext, useContext, useState, useCallback, useId } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4000) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toastMethods = {
    success: (message: string, title?: string, duration?: number) =>
      addToast("success", message, title, duration),
    error: (message: string, title?: string, duration?: number) =>
      addToast("error", message, title, duration),
    info: (message: string, title?: string, duration?: number) =>
      addToast("info", message, title, duration),
    warning: (message: string, title?: string, duration?: number) =>
      addToast("warning", message, title, duration),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, dismissToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
              item.type === "success"
                ? "bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10"
                : item.type === "error"
                ? "bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10"
                : item.type === "warning"
                ? "bg-white/95 border-amber-200 text-slate-800 shadow-amber-500/10"
                : "bg-white/95 border-blue-200 text-slate-800 shadow-blue-500/10"
            }`}
          >
            {/* Status Icon */}
            <div className="shrink-0 mt-0.5">
              {item.type === "success" && (
                <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {item.type === "error" && (
                <div className="p-1 rounded-lg bg-rose-50 text-rose-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {item.type === "warning" && (
                <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {item.type === "info" && (
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              {item.title && (
                <h5 className="text-xs font-bold text-slate-900 tracking-tight mb-0.5">
                  {item.title}
                </h5>
              )}
              <p className="text-xs text-slate-600 leading-relaxed break-words font-medium">
                {item.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
