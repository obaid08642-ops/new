"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Sparkles } from "lucide-react";

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

  const isSuccess = state === "success";
  const isLoading = state === "loading";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={claim}
        disabled={disabled || isLoading || isSuccess}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.55rem 1.15rem",
          borderRadius: "var(--radius-pill)",
          border: 0,
          background: disabled
            ? "#CBD5E1"
            : isSuccess
            ? "#00876F"
            : "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#fff",
          fontSize: "0.86rem",
          fontWeight: 700,
          cursor: disabled || isSuccess ? "default" : "pointer",
          boxShadow: disabled ? "none" : "0 4px 12px rgba(217,119,6,0.22)",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {isLoading ? (
          <LoaderCircle size={15} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : isSuccess ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Sparkles size={15} aria-hidden="true" />
        )}
        {isLoading ? labels.claiming : isSuccess ? labels.claimed : labels.claim}
      </button>
      {state === "error" && <span role="alert" style={{ color: "#b3261e", fontSize: 13, fontWeight: 650 }}>{labels.error}</span>}
    </span>
  );
}
