"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Labels = { claim: string; claiming: string; claimed: string; error: string };

export function ClaimButton({ rewardId, disabled, labels }: { rewardId: string; disabled?: boolean; labels: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function claim() {
    if (state === "loading" || disabled) return;
    setState("loading");
    try {
      const response = await fetch(`/api/patient/loyalty/rewards/${encodeURIComponent(rewardId)}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("claim_failed");
      setState("success");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    <button
      type="button"
      onClick={claim}
      disabled={disabled || state === "loading" || state === "success"}
      style={{ padding: "8px 16px", borderRadius: 10, border: 0, background: disabled || state === "success" ? "var(--border, #d6dbe3)" : "var(--primary, #0d6e56)", color: "#fff", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {state === "loading" ? labels.claiming : state === "success" ? labels.claimed : labels.claim}
    </button>
    {state === "error" && <span role="alert" style={{ color: "#b3261e", fontSize: 13 }}>{labels.error}</span>}
  </span>;
}
