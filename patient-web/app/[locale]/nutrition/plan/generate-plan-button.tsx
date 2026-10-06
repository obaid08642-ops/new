"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

type Labels = { generate: string; generating: string; error: string };

export function GeneratePlanButton({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function generate() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/patient/nutrition/plan/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("generate_failed");
      setState("idle");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const isLoading = state === "loading";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        onClick={generate}
        disabled={isLoading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.6rem 1.2rem",
          borderRadius: "var(--radius-pill)",
          border: 0,
          background: isLoading ? "#CBD5E1" : "linear-gradient(135deg, #00C9A7, #00876F)",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: isLoading ? "default" : "pointer",
          boxShadow: isLoading ? "none" : "0 4px 12px rgba(0,135,111,0.22)",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease",
        }}
      >
        {isLoading ? (
          <LoaderCircle size={16} style={{ animation: "spin 0.8s linear infinite" }} />
        ) : (
          <Sparkles size={16} aria-hidden="true" />
        )}
        {isLoading ? labels.generating : labels.generate}
      </button>
      {state === "error" && (
        <span role="alert" style={{ color: "#b3261e", fontSize: 13, fontWeight: 650 }}>
          {labels.error}
        </span>
      )}
    </span>
  );
}
