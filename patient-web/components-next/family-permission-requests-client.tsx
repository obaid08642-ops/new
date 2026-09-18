"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PermissionRequest = { id: string; memberName?: string; permissions: string[] };

export function FamilyPermissionRequestsClient({
  locale,
  requests,
}: {
  locale: string;
  requests: PermissionRequest[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const ar = locale === "ar";

  async function decide(id: string, decision: "approved" | "rejected") {
    setError(null);
    setActing(id);
    try {
      const res = await fetch(`/api/family/permissions/${encodeURIComponent(id)}/respond`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر تسجيل القرار" : "Could not record decision"));
        return;
      }
      router.refresh();
    } catch {
      setError(ar ? "تعذر تسجيل القرار" : "Could not record decision");
    } finally {
      setActing(null);
    }
  }

  if (!requests.length)
    return (
      <p style={{ color: "#1E332E", overflowWrap: "anywhere", margin: 0, fontSize: ".94rem", lineHeight: 1.6 }}>
        {ar ? "لا توجد طلبات معلقة." : "No pending requests."}
      </p>
    );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {requests.map((r) => (
        <section
          key={r.id}
          aria-label={r.memberName || r.id}
          style={{
            display: "grid",
            gap: 8,
            padding: 16,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 24px rgba(30,51,46,0.07)",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#1E332E",
              fontSize: "1rem",
              fontWeight: 800,
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {r.memberName || r.id}
          </h3>
          <p
            style={{
              margin: 0,
              color: "#64748B",
              fontSize: ".9rem",
              lineHeight: 1.6,
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {r.permissions.length ? r.permissions.join(", ") : ar ? "لا توجد أذونات" : "No permissions"}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => decide(r.id, "approved")}
              disabled={acting === r.id}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#5FD9B3",
                color: "#1E332E",
                fontWeight: 700,
                fontSize: ".9rem",
                cursor: "pointer",
                opacity: acting === r.id ? 0.7 : 1,
              }}
            >
              {acting === r.id ? (ar ? "جارٍ..." : "Saving...") : ar ? "قبول" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => decide(r.id, "rejected")}
              disabled={acting === r.id}
              style={{
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #E8EDEE",
                background: "#FDFDFC",
                color: "#1E332E",
                fontWeight: 700,
                fontSize: ".9rem",
                cursor: "pointer",
                opacity: acting === r.id ? 0.7 : 1,
              }}
            >
              {ar ? "رفض" : "Reject"}
            </button>
          </div>
        </section>
      ))}
      {error ? (
        <p
          role="alert"
          style={{
            color: "#B42318",
            background: "rgba(255,255,255,0.82)",
            border: "1px solid #E8EDEE",
            borderRadius: 16,
            padding: 16,
            margin: 0,
            overflowWrap: "anywhere",
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
