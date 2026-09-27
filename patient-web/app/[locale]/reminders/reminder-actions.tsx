"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** F69: per-reminder actions (same endpoints as the app). */
export function ReminderActions({ locale, id, nextTimeKey }: { locale: string; id: string; nextTimeKey?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logTaken = async () => {
    setBusy(true);
    try {
      await fetch(`/api/health/reminders/${encodeURIComponent(id)}/log`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "taken", time_key: nextTimeKey || "" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(locale === "ar" ? "حذف هذا التذكير؟" : "Delete this reminder?")) return;
    setBusy(true);
    try {
      await fetch(`/api/health/reminders/${encodeURIComponent(id)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={() => void logTaken()} disabled={busy}>✓</button>
      <Link href={`/${locale}/reminders/add?edit=${encodeURIComponent(id)}`}>✎</Link>
      <button type="button" onClick={() => void remove()} disabled={busy}>×</button>
    </span>
  );
}
