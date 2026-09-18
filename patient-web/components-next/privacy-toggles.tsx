"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock, MapPin, BarChart3, Megaphone, Share2 } from "lucide-react";

export type PrivacyState = { shareData: boolean; analytics: boolean; location: boolean; marketing: boolean; thirdParty: boolean };

type Labels = { saveFailed: string; unavailable: string; saving: string };

const KEYS: (keyof PrivacyState)[] = ["location", "analytics", "shareData", "marketing", "thirdParty"];

const ICONS: Record<keyof PrivacyState, React.ReactNode> = {
  location: <MapPin size={18} aria-hidden="true" />,
  analytics: <BarChart3 size={18} aria-hidden="true" />,
  shareData: <Share2 size={18} aria-hidden="true" />,
  marketing: <Megaphone size={18} aria-hidden="true" />,
  thirdParty: <Lock size={18} aria-hidden="true" />,
};

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
    <div style={{ display: "grid", gap: 16 }}>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 16, margin: 0 }}>
        {KEYS.map((key) => (
          <li
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "48px minmax(0,1fr) auto",
              alignItems: "center",
              gap: 16,
              border: "1px solid #E8EDEE",
              borderRadius: 20,
              padding: "16px",
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 8px 24px rgba(30,51,46,.07)",
            } as any}
          >
            <span style={{ display: "grid", placeItems: "center", inlineSize: 48, blockSize: 48, borderRadius: 16, color: "#1E332E", background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flexShrink: 0 }}>{ICONS[key]}</span>
            <div style={{ minInlineSize: 0, display: "grid", gap: 4 }}>
              <strong style={{ color: "#1E332E", fontSize: ".95rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{names[key].label}</strong>
              <span style={{ color: "#64748B", fontSize: ".84rem", lineHeight: 1.55, overflowWrap: "anywhere" } as any}>{names[key].sub}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[key]}
              aria-label={names[key].label}
              onClick={() => toggle(key)}
              disabled={busy !== null}
              style={{
                minWidth: 72,
                padding: "8px 14px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: state[key] ? "#5FD9B3" : "rgba(255,255,255,.92)",
                color: "#1E332E",
                fontWeight: 800,
                fontSize: ".84rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: busy !== null ? "not-allowed" : "pointer",
                opacity: busy !== null && busy !== key ? 0.6 : 1,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                transition: "transform .16s ease, background .16s ease",
              } as any}
            >
              {busy === key ? <LoaderCircle size={16} aria-hidden="true" style={{ animation: "spin 1s linear infinite" } as any} /> : state[key] ? "✓" : "○"}
              <span style={{ overflowWrap: "anywhere" } as any}>{state[key] ? "On" : "Off"}</span>
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" style={{ margin: 0, padding: 12, borderRadius: 16, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", color: "#b91c1c", overflowWrap: "anywhere", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>{error}</p> : null}
      {busy && !error ? <p role="status" style={{ margin: 0, color: "#64748B", overflowWrap: "anywhere" } as any}>{labels.saving}</p> : null}
    </div>
  );
}
