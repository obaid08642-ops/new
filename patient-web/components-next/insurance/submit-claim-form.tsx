"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { formatPrice } from "@/lib/format-price";
import { asRecord, type Rec } from "@/lib/insurance/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

type Kind = "consultation" | "pharmacy" | "lab" | "radiology" | "nursing";
type Booking = { kind: Kind; id: string; doctor?: string; amount: number };

/** One GET of a list of the patient's bookings or orders; a list that cannot load is empty (the claim form only offers what loaded). */
async function fetchList(path: string): Promise<Rec[]> {
  try {
    const res = await fetch(`/api/patient${path}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return [];
    const body: unknown = await res.json().catch(() => null);
    const root = asRecord(body);
    const list = Array.isArray(body) ? body : ["data", "items", "bookings", "orders", "appointments"].map((key) => root?.[key]).find(Array.isArray);
    return (Array.isArray(list) ? list : []).map(asRecord).filter((row): row is Rec => !!row);
  } catch {
    return [];
  }
}

const paidish = (row: Rec) => ["paid", "completed", "delivered", "reported", "confirmed"].includes(String(row.payment_status ?? row.status ?? row.state ?? "").toLowerCase());
const amountOf = (row: Rec) => Number(row.total ?? row.total_price ?? row.price ?? 0) || 0;

/**
 * Submit a claim (POST /api/insurance/claims, the body and the idempotency key as before): the patient picks one of the paid
 * bookings the lists return, and the server resolves eligibility and amount from the booking itself.
 */
export function SubmitClaimForm() {
  const t = useTranslations("InsuranceWeb");
  const locale = useLocale();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const titleOf = (b: Booking) => b.doctor ?? `${t(`claim.kind.${b.kind}`)} #${b.id.slice(0, 8)}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, orders, labs, rads, nursing] = await Promise.all([
        fetchList("/care/appointments"),
        fetchList("/orders/mine"),
        fetchList("/labs/bookings/mine"),
        fetchList("/radiology/bookings/mine"),
        fetchList("/home-care/bookings/my"),
      ]);
      const out: Booking[] = [];
      const push = (kind: Kind, rows: Rec[]) => {
        for (const row of rows) {
          if (!row.id || !paidish(row) || amountOf(row) <= 0) continue;
          const doctor = kind === "consultation" ? String(row.doctor_name || row.doctorName || "") : "";
          out.push({ kind, id: String(row.id), doctor: doctor || undefined, amount: amountOf(row) });
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

  useEffect(() => { void load(); }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const booking = bookings.find((b) => `${b.kind}:${b.id}` === selected);
    if (!booking) { setError(t("claim.pick")); return; }
    setError(null);
    setSaving(true);
    try {
      // R7-4: the server resolves eligibility and amount from the booking itself. Never send status/submitted_at.
      const res = await fetch("/api/insurance/claims", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-claim-${booking.kind}-${booking.id}`.slice(0, 64) },
        body: JSON.stringify({ booking_kind: booking.kind, booking_id: booking.id, claim_type: "reimbursement", amount: booking.amount, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError((data as { message?: string } | null)?.message || t("claim.failed")); return; }
      setDone(true);
      router.refresh();
    } catch {
      setError(t("claim.failed"));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <section className={`${rx.card} ${forms.stack}`} role="status">
        <p className={rx.lead}>{t("claim.done")}</p>
        <ButtonLink href={`/${locale}/insurance?tab=claims`} label={t("claim.viewClaims")} fullWidth />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`${rx.card} ${forms.stack}`} noValidate aria-label={t("claim.title")}>
      <label className={forms.field}>
        <span className={forms.label}>{t("claim.booking")}</span>
        {loading ? (
          <p className={rx.lead} role="status">{t("claim.loading")}</p>
        ) : bookings.length === 0 ? (
          <p className={rx.lead} role="status">{t("claim.none")}</p>
        ) : (
          <select className={forms.control} value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">{t("claim.placeholder")}</option>
            {bookings.map((b) => <option key={`${b.kind}:${b.id}`} value={`${b.kind}:${b.id}`}>{`${t(`claim.kind.${b.kind}`)} — ${titleOf(b)} — ${formatPrice(locale, b.amount).text}`}</option>)}
          </select>
        )}
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("claim.note")}</span>
        <textarea className={forms.control} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("claim.submit")} size="lg" fullWidth loading={saving} disabled={!selected} />
    </form>
  );
}
