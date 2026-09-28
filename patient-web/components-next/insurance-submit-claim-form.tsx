"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Booking = { kind: string; id: string; title: string; amount: number };

const KIND_LABEL: Record<string, string> = {
  consultation: "استشارة طبية",
  pharmacy: "أدوية",
  lab: "تحاليل",
  radiology: "أشعة",
  nursing: "تمريض منزلي",
};

async function fetchList(path: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/patient${path}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return [];
    const body = await res.json().catch(() => null);
    if (Array.isArray(body)) return body;
    const root = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    for (const key of ["data", "items", "bookings", "orders", "appointments"]) {
      if (Array.isArray(root[key])) return root[key] as any[];
    }
    return [];
  } catch {
    return [];
  }
}

const paidish = (row: any) =>
  ["paid", "completed", "delivered", "reported", "confirmed"].includes(
    String(row?.payment_status ?? row?.status ?? row?.state ?? "").toLowerCase(),
  );

const amountOf = (row: any) =>
  Number(row?.total ?? row?.total_price ?? row?.price ?? 0) || 0;

const titleOf = (kind: string, row: any) =>
  kind === "consultation"
    ? String(row?.doctor_name || row?.doctorName || "استشارة طبية")
    : `${KIND_LABEL[kind] || kind} #${String(row?.id || "").slice(0, 8)}`;

export function InsuranceSubmitClaimForm({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, orders, labs, rads, nursing] = await Promise.all([
        fetchList("/care/appointments/mine"),
        fetchList("/orders/mine"),
        fetchList("/labs/bookings/mine"),
        fetchList("/radiology/bookings/mine"),
        fetchList("/home-care/bookings/my"),
      ]);
      const out: Booking[] = [];
      const push = (kind: string, rows: any[]) => {
        for (const row of rows) {
          if (!row?.id || !paidish(row) || amountOf(row) <= 0) continue;
          out.push({ kind, id: String(row.id), title: titleOf(kind, row), amount: amountOf(row) });
        }
      };
      push("consultation", appts);
      push("pharmacy", orders);
      push("lab", labs);
      push("radiology", rads);
      push("nursing", nursing);
      setBookings(out);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const booking = bookings.find((b) => `${b.kind}:${b.id}` === selected);
    if (!booking) {
      setError(ar ? "اختر حجزًا مدفوعًا للمطالبة به." : "Pick a paid booking to claim.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // R7-4: the server resolves eligibility and amount from the booking itself.
      // Never send status/submitted_at — the server owns those.
      const res = await fetch("/api/insurance/claims", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `web-claim-${booking.kind}-${booking.id}`.slice(0, 64),
        },
        body: JSON.stringify({
          booking_kind: booking.kind,
          booking_id: booking.id,
          claim_type: "reimbursement",
          amount: booking.amount,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر تقديم المطالبة" : "Could not submit claim"));
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(ar ? "تعذر تقديم المطالبة" : "Could not submit claim");
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <p role="status">
        {ar ? "تم تقديم المطالبة — ستتم مراجعتها خلال 2-5 أيام عمل." : "Claim submitted — review takes 2-5 business days."}
      </p>
    );

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الحجز المدفوع" : "Paid booking"}</span>
        {loading ? (
          <p role="status">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
        ) : bookings.length === 0 ? (
          <p role="status">{ar ? "لا توجد حجوزات مدفوعة مؤهلة للمطالبة." : "No eligible paid bookings."}</p>
        ) : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{ar ? "اختر…" : "Pick…"}</option>
            {bookings.map((b) => (
              <option key={`${b.kind}:${b.id}`} value={`${b.kind}:${b.id}`}>
                {(KIND_LABEL[b.kind] || b.kind)} — {b.title} — {b.amount.toFixed(2)}
              </option>
            ))}
          </select>
        )}
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "ملاحظة (اختياري)" : "Note (optional)"}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving || !selected}>
        {saving ? (ar ? "جارٍ الإرسال…" : "Submitting…") : ar ? "تقديم المطالبة" : "Submit claim"}
      </button>
    </form>
  );
}
