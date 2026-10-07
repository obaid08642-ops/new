"use client";

import { useEffect, useState } from "react";
import React from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import styles from "./toast.module.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className={styles.container} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
      }, toast.duration ?? 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  const icons = {
    success: <CheckCircle className={styles.iconSuccess} aria-hidden="true" />,
    error: <AlertCircle className={styles.iconError} aria-hidden="true" />,
    warning: <AlertTriangle className={styles.iconWarning} aria-hidden="true" />,
    info: <Info className={styles.iconInfo} aria-hidden="true" />,
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exiting : ""}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.iconWrapper}>{icons[toast.type]}</div>
      <div className={styles.content}>
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.message}>{toast.message}</div>}
        {toast.action && (
          <button
            className={styles.action}
            onClick={() => {
              toast.action!.onClick();
              onRemove(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        className={styles.close}
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onRemove(toast.id), 200);
        }}
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function toast(toast: Omit<Toast, "id">) {
  if (typeof window === "undefined") return "";
  const event = new CustomEvent("nabd:toast", { detail: toast });
  window.dispatchEvent(event);
  return "";
}

export function useToastListener() {
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { addToast } = useToast();
      addToast(e.detail);
    };
    window.addEventListener("nabd:toast", handler as EventListener);
    return () => window.removeEventListener("nabd:toast", handler as EventListener);
  }, []);
}