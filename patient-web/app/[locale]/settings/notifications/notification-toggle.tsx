"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** F69: notification settings toggles (same endpoint as the app). */
export function NotificationToggle({ initial, settingKey, label }: { initial: boolean; settingKey: string; label: string }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/patient/users/me/notification-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ [settingKey]: !on }),
      });
      if (res.ok) {
        setOn(!on);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={() => void toggle()} disabled={busy} aria-pressed={on} aria-label={label}
      style={{ marginInlineStart: "auto", padding: "6px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: on ? "#5FD9B3" : "rgba(255,255,255,.82)", color: "#1E332E", fontSize: ".82rem", cursor: "pointer" }}>
      {on ? "✓" : "○"}
    </button>
  );
}
