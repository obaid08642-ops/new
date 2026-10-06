"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { Input, Select } from "@/components-next/ui-generated/components/Inputs";
import { Chip } from "@/components-next/ui-generated/components/Surfaces";
import styles from "@/components-next/nursing/nursing.module.css";

export type BookingService = { id: string; name: string; price?: number };
export type BookingAddress = { id: string; label: string };

function nextDays(count: number, locale: string): Array<{ iso: string; label: string }> {
  const out: Array<{ iso: string; label: string }> = [];
  // Gregorian by default; Hijri automatically when the device uses it.
  let calendar = "gregory";
  try {
    const deviceCal = Intl.DateTimeFormat().resolvedOptions().calendar || "";
    if (/islamic|hijri/i.test(deviceCal)) calendar = "islamic-umalqura";
  } catch {}
  const tag = `${locale}-u-ca-${calendar}`;
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short" }).format(d),
    });
  }
  return out;
}

export type NursingBookingInput = { serviceId: string; scheduledAt: string; addressId?: string; notes?: string; method: "cash" | "card" | "insurance" };
export type NursingBookingResult = { ok: true; bookingId?: string } | { ok: false; message?: string };

/** The booking call, as it always was: one POST with an idempotency key; a booking exists only when the answer is a success. */
export async function createNursingBooking(input: NursingBookingInput, send: typeof fetch = fetch): Promise<NursingBookingResult> {
  const res = await send("/api/nursing/bookings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": `web-nursing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    },
    body: JSON.stringify({
      service_id: input.serviceId,
      scheduled_at: input.scheduledAt,
      address_id: input.addressId || undefined,
      notes: input.notes?.trim() || undefined,
      payment_method: input.method,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, message: (data as { message?: string } | null)?.message };
  const booking = (data as { data?: { id?: string }; id?: string } | null)?.data ?? data;
  return { ok: true, bookingId: (booking as { id?: string } | null)?.id };
}

const TIMES = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
const METHODS = ["cash", "card", "insurance"] as const;

/**
 * The booking form of the nurse's page (canvas/DoctorFull, "choose the time"). HIGH care: the call, its body, the
 * idempotency key and where each outcome goes are exactly what they were; only the look and the words changed. A booking
 * is only shown as made after the call answered (the page it goes to is the visit).
 */
export function NursingBookingForm({
  locale,
  services,
  addresses,
}: {
  locale: string;
  services: BookingService[];
  addresses: BookingAddress[];
}) {
  const t = useTranslations("NursingWeb");
  const router = useRouter();
  const days = useMemo(() => nextDays(7, locale), [locale]);
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [day, setDay] = useState(days[0]?.iso || "");
  const [time, setTime] = useState<string | null>(null);
  const [addressId, setAddressId] = useState(addresses.find((a) => a)?.id || "");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "insurance">("cash");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const money = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "SAR" }), [locale]);
  const clock = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }), [locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!serviceId) {
      setError(t("formSelectService"));
      return;
    }
    if (!time) {
      setError(t("formSelectTime"));
      return;
    }
    const scheduled = new Date(`${day}T${time}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
      setError(t("formPast"));
      return;
    }
    setSaving(true);
    try {
      const result = await createNursingBooking({ serviceId, scheduledAt: scheduled.toISOString(), addressId, notes, method });
      if (!result.ok) {
        setError(result.message || t("formFailed"));
        return;
      }
      const bookingId = result.bookingId;
      if (method === "insurance") {
        router.push(`/${locale}/nursing/visits${bookingId ? `/${encodeURIComponent(bookingId)}` : ""}`);
      } else if (bookingId) {
        router.push(`/${locale}/nursing/visits/${encodeURIComponent(bookingId)}`);
      } else {
        router.push(`/${locale}/nursing/visits`);
      }
      router.refresh();
    } catch {
      setError(t("formFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!services.length) return null;

  return (
    <form onSubmit={onSubmit} className={styles.form} noValidate>
      <Select
        label={t("formService")}
        value={serviceId}
        onChange={setServiceId}
        options={services.map((s) => ({ value: s.id, label: s.price !== undefined ? `${s.name} — ${money.format(s.price)}` : s.name }))}
      />
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("formDay")}</legend>
        <div className={styles.strip}>
          {days.map((d) => (
            <Chip key={d.iso} label={d.label} selected={day === d.iso} onClick={() => setDay(d.iso)} />
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{t("formTime")}</legend>
        <div className={styles.slots}>
          {TIMES.map((slot) => (
            <Chip key={slot} label={clock.format(new Date(`2000-01-01T${slot}:00`))} selected={time === slot} onClick={() => setTime(slot)} />
          ))}
        </div>
      </fieldset>
      {addresses.length > 0 ? (
        <Select label={t("formAddress")} value={addressId} onChange={setAddressId} options={addresses.map((a) => ({ value: a.id, label: a.label }))} />
      ) : (
        <Link href={`/${locale}/profile/addresses`} className={styles.addAddress}>
          {t("formAddAddress")}
        </Link>
      )}
      <Input label={t("formNotes")} value={notes} onChange={(v) => setNotes(v.slice(0, 2000))} multiline rows={3} />
      <Segmented
        label={t("formMethod")}
        options={METHODS.map((m) => ({ value: m, label: t(`method_${m}`) }))}
        value={method}
        onChange={(v) => setMethod(v as (typeof METHODS)[number])}
      />
      {error ? (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" fullWidth loading={saving} label={saving ? t("formBooking") : t("formConfirm")} />
    </form>
  );
}
