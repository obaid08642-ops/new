"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { dismissToast, getToasts, subscribeToasts, type Toast } from "@/lib/api/net/toast";

/**
 * P15.3 — renders the rollback/failure toasts pushed by `runOptimistic`.
 *
 * Mounted once in the locale layout, so any optimistic action on any screen can
 * explain a rollback without each screen owning its own toast UI. The title and
 * message arrive already localized (the hook resolves them from the 13.R5
 * catalogue in the current locale); only the dismiss control is labeled here.
 */
export function ToastViewport() {
  const t = useTranslations("Network");
  const [toasts, setToasts] = useState<Toast[]>(() => getToasts());

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div aria-live="assertive" style={{ position: "fixed", insetInline: 16, bottom: 16, zIndex: 60, display: "grid", gap: 8, maxWidth: 420 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === "error" ? "alert" : "status"}
          style={{
            background: "#1E332E",
            color: "#fff",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            boxShadow: "0 8px 24px rgba(30,51,46,.25)",
          }}
        >
          <div style={{ display: "grid", gap: 4, flex: 1 }}>
            <strong style={{ fontSize: ".9rem" }}>{toast.title}</strong>
            <span style={{ fontSize: ".82rem", opacity: 0.9 }}>{toast.message}</span>
            {toast.reference ? (
              <span style={{ fontSize: ".72rem", opacity: 0.7, overflowWrap: "anywhere" }}>{toast.reference}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label={t("dismiss")}
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: "1.1rem", cursor: "pointer", padding: 4 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
