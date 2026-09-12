"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export type PrivacyState = { shareData: boolean; analytics: boolean; location: boolean; marketing: boolean; thirdParty: boolean };

type Labels = { saveFailed: string; unavailable: string; saving: string };

const KEYS: (keyof PrivacyState)[] = ["location", "analytics", "shareData", "marketing", "thirdParty"];

export function PrivacyToggles({ initial, names, labels }: { initial: PrivacyState; names: Record<keyof PrivacyState, { label: string; sub: string }>; labels: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<PrivacyState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<keyof PrivacyState | null>(null);

  async function toggle(key: keyof PrivacyState) {
    if (busy) return;
    const next = !state[key];
    setBusy(key); setError(null);
    try {
      const response = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!response.ok) { setError(labels.saveFailed); return; }
      setState((s) => ({ ...s, [key]: next }));
      router.refresh();
    } catch {
      setError(labels.unavailable);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {KEYS.map((key) => (
          <li key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "1px solid var(--border, #e2e7ee)", borderRadius: 12, padding: "12px 14px" }}>
            <div>
              <strong>{names[key].label}</strong>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{names[key].sub}</div>
            </div>
            <button type="button" role="switch" aria-checked={state[key]} aria-label={names[key].label} onClick={() => toggle(key)} disabled={busy !== null} style={{ minWidth: 64 }}>
              {busy === key ? <LoaderCircle size={16} aria-hidden="true" /> : state[key] ? "✓" : "○"}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : busy ? <p role="status">{labels.saving}</p> : null}
    </div>
  );
}
