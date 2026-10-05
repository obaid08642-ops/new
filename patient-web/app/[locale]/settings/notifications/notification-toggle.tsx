"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOptimisticAction } from "@/lib/api/use-optimistic-action";

/**
 * F69: notification settings toggles (same endpoint as the app).
 * P15.3: reminders on/off is SAFE-optimistic — the toggle flips instantly and
 * rolls back with an explaining toast when the PATCH fails, instead of silently
 * swallowing the failure as before.
 */
export function NotificationToggle({ initial, settingKey, label }: { initial: boolean; settingKey: string; label: string }) {
  const [on, setOn] = useState(initial);
  const { run, pending } = useOptimisticAction<Response>();
  const router = useRouter();

  const toggle = () => {
    if (pending) return;
    const next = !on;
    void run("notification", {
      apply: () => setOn(next),
      rollback: () => setOn(on),
      commit: async () => {
        const res = await fetch("/api/patient/users/me/notification-settings", {
          method: "PATCH",
          headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
          body: JSON.stringify({ [settingKey]: next }),
        });
        if (!res.ok) throw new Error(`notification_settings_${res.status}`);
        return res;
      },
      onCommitted: () => router.refresh(),
    },
    {
      // P15.4: offline taps queue and replay in order on reconnect.
      outbox: {
        kind: "notification",
        url: "/api/patient/users/me/notification-settings",
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ [settingKey]: next }),
      },
    });
  };

  return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} aria-label={label}
      style={{ marginInlineStart: "auto", padding: "6px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: on ? "#5FD9B3" : "rgba(255,255,255,.82)", color: "#1E332E", fontSize: ".82rem", cursor: "pointer" }}>
      {on ? "✓" : "○"}
    </button>
  );
}
