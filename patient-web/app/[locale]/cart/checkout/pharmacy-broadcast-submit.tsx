"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId, type PatientPharmacyDraftItem } from "@/lib/api/pharmacy-draft";

type Props = { locale: string; items: PatientPharmacyDraftItem[]; labels: { submit: string; loading: string; error: string } };
export function PharmacyBroadcastSubmit({ locale, items, labels }: Props) {
  const router = useRouter(); const createKey = useRef<string | null>(null); const submitKey = useRef<string | null>(null); const [state, setState] = useState<"idle" | "loading" | "error">("idle"); const [error, setError] = useState("");
  async function submit() {
    if (state === "loading") return;
    const draft = buildPatientPharmacyDraft(items); if (!draft) { setState("error"); setError(labels.error); return; }
    createKey.current ??= crypto.randomUUID(); submitKey.current ??= crypto.randomUUID(); setState("loading"); setError("");
    try {
      const created = await fetch("/api/patient/pharmacy/orders", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": createKey.current }, body: JSON.stringify(draft) });
      const orderId = created.ok ? extractPatientPharmacyOrderId(await created.json().catch(() => null)) : null;
      if (!orderId) throw new Error("pharmacy_draft_unavailable");
      const broadcast = await fetch(`/api/patient/pharmacy/orders/${encodeURIComponent(orderId)}/submit`, { method: "POST", headers: { "idempotency-key": submitKey.current } });
      if (!broadcast.ok) throw new Error("pharmacy_broadcast_unavailable");
      router.push(`/${locale}/orders/${orderId}/offers`);
    } catch { setState("error"); setError(labels.error); }
  }
  return <section className="pharmacyBroadcastSubmit"><p>{locale === "ar" ? "سيُنشأ طلب صيدلية بلا سعر أو دفع، ثم يُرسل إلى الصيدليات لتقديم عروض مستقلة." : "A pharmacy order is created without a price or payment, then broadcast to pharmacies for independent offers."}</p><button type="button" onClick={submit} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.submit}</button>{error && <p role="alert">{error}</p>}</section>;
}
