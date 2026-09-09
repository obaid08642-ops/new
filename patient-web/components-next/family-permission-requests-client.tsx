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

  if (!requests.length) return <p>{ar ? "لا توجد طلبات معلقة." : "No pending requests."}</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {requests.map((r) => (
        <section key={r.id} aria-label={r.memberName || r.id}>
          <p><strong>{r.memberName || r.id}</strong> — {r.permissions.join(", ")}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => decide(r.id, "approved")} disabled={acting === r.id}>
              {ar ? "قبول" : "Approve"}
            </button>
            <button type="button" onClick={() => decide(r.id, "rejected")} disabled={acting === r.id}>
              {ar ? "رفض" : "Reject"}
            </button>
          </div>
        </section>
      ))}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
