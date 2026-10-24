"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { Segmented } from "@/components-next/ui-generated/components/Controls";
import { Input, Select } from "@/components-next/ui-generated/components/Inputs";
import { SectionCard } from "@/components-next/consult/consult-parts";
import { startNursingPayment } from "@/components-next/nursing/nursing-pay";
import styles from "@/components-next/consult/consult.module.css";
import { formatPrice } from "@/lib/format-price";
import type { InsuranceOnFile } from "@/lib/nursing/nurse";
import { chosenSlot, nurseSlotsView, parseNurseSlots, type NurseSlotsResult } from "@/lib/nursing/nurse-slots";
import nursing from "@/components-next/nursing/nursing.module.css";

export type BookableNurse = { id: string; name: string; detail?: string };
export type BookableAddress = { id: string; label: string };
type Method = "card" | "insurance";

function nextDays(count: number, locale: string) {
  const today = new Date();
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const dayFmt = new Intl.NumberFormat(locale, { useGrouping: false });
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    // the calendar date the patient sees, not the UTC date of local midnight
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { iso, weekday: weekday.format(d), dateNum: dayFmt.format(d.getDate()), month: monthFmt.format(d) };
  });
}

function newKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export type HomeCareBookingInput = { nurseId: string; serviceId: string; slot: string; addressId: string; /** The browser's current position, used instead of a saved address. */ location?: { lat: number; lng: number }; notes: string; method: Method };
export type HomeCareBookingResult = { ok: true; id: string } | { ok: false; status: number; code: string };

/**
 * One booking attempt (POST /api/nursing/bookings). The idempotency key is kept until the server gives a definite answer:
 * after a lost connection the server may have booked already, so the retry carries the same key and cannot book twice.
 * A network error is thrown to the caller (the key is kept); any answer from the server ends the attempt.
 */
export function createHomeCareBookingAttempt(send: typeof fetch = (...a) => fetch(...a), makeKey: () => string = newKey) {
  let pending: string | null = null;
  return async function book(input: HomeCareBookingInput): Promise<HomeCareBookingResult> {
    const key = pending ?? makeKey();
    pending = key;
    const res = await send("/api/nursing/bookings", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ provider_id: input.nurseId, service_id: input.serviceId, scheduled_at: input.slot, ...(input.location ? { location: input.location } : { address_id: input.addressId }), notes: input.notes.trim() || undefined, payment_method: input.method }),
    });
    pending = null;
    const data = (await res.json().catch(() => null)) as { id?: unknown; message?: unknown } | null;
    if (res.ok && typeof data?.id === "string") return { ok: true, id: data.id };
    return { ok: false, status: res.status, code: typeof data?.message === "string" ? data.message : "" };
  };
}

/**
 * journeys#60 (issue 1069): booking a home nursing service on the website, as the app's nurse-profile screen books it.
 * The nurses are the approved nurses offering this service, the times are the chosen nurse's own free slots
 * (GET /home-care/providers/:id/slots), the place is one of the patient's saved addresses that has a map location, and the
 * visit is paid by card (the Moyasar page) or sent to the insurer (decision 25: no cash). The booking request keeps its
 * idempotency key until the server gives a definite answer, so a retry after a lost connection never books twice.
 */
export function HomeCareBookingForm({ locale, serviceId, nurses, addresses, insurance, price, initialMethod = "card", insuranceOnFile }: {
  locale: string;
  serviceId: string;
  nurses: BookableNurse[];
  addresses: BookableAddress[];
  insurance: boolean;
  /** The visit price of the service for this nurse (the server charges the catalogue price); unset when the server sent none. */
  price?: number;
  /** The way chosen on the hub (decision 25: card or insurance). */
  initialMethod?: Method;
  /** The patient's policy from the coverage check (insurance flow only); null when it could not be read. */
  insuranceOnFile?: InsuranceOnFile | null;
}) {
  const t = useTranslations("NursingWeb");
  const router = useRouter();
  const days = useMemo(() => nextDays(7, locale), [locale]);
  const clock = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);
  const methods: Method[] = insurance ? ["card", "insurance"] : ["card"];
  const [nurseId, setNurseId] = useState(nurses[0]?.id ?? "");
  const [day, setDay] = useState(days[0]?.iso ?? "");
  const [slotsResult, setSlotsResult] = useState<NurseSlotsResult | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // issue 1571: the times shown are the ones loaded for the nurse and day chosen now, never the previous day's
  const { state: slotsState, slots } = nurseSlotsView(slotsResult, nurseId, day);
  const slot = chosenSlot({ state: slotsState, slots }, picked);
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<Method>(insurance && initialMethod === "insurance" ? "insurance" : "card");
  const noPolicy = method === "insurance" && insuranceOnFile?.has === false;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const attempt = useRef<ReturnType<typeof createHomeCareBookingAttempt> | null>(null);

  useEffect(() => {
    setPicked(null);
    if (!nurseId || !day) return;
    const controller = new AbortController();
    fetch(`/api/patient/home-care/providers/${encodeURIComponent(nurseId)}/slots?date=${day}`, { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("slots_unavailable"))))
      .then((data: unknown) => { if (!controller.signal.aborted) setSlotsResult({ nurseId, day, state: "ready", slots: parseNurseSlots(data) }); })
      .catch(() => { if (!controller.signal.aborted) setSlotsResult({ nurseId, day, state: "failed", slots: [] }); });
    return () => controller.abort();
  }, [nurseId, day]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocationError(true); return; }
    setLocating(true); setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocationError(true); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function submit() {
    if (busy.current) return;
    setError(null);
    if (!slot) { setError(t("formSelectTime")); return; }
    if (Date.parse(slot) < Date.now()) { setError(t("formPast")); return; }
    if (!addressId && !here) { setError(t("formAddAddress")); return; }
    if (noPolicy) { setError(t("insNoPolicy")); return; }
    busy.current = true;
    setSaving(true);
    attempt.current ??= createHomeCareBookingAttempt();
    try {
      const result = await attempt.current({ nurseId, serviceId, slot, addressId, ...(here ? { location: here } : {}), notes, method });
      if (!result.ok) {
        setError(result.code === "address_location_required" ? t("addressNeedsLocation") : /slot|conflict|taken/i.test(result.code) || result.status === 409 ? t("slotTaken") : t("formFailed"));
        return;
      }
      const bookingId = result.id;
      if (method === "insurance") {
        router.push(`/${locale}/nursing/insurance-status?bookingId=${encodeURIComponent(bookingId)}`);
        return;
      }
      const paid = await startNursingPayment(bookingId);
      // the booking exists; when the payment page cannot open, the visit page offers it again
      if (!paid) router.push(`/${locale}/nursing/visits/${encodeURIComponent(bookingId)}?pay=failed`);
    } catch {
      setError(t("formFailed"));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  if (!nurses.length) return <p className={`${styles.body} ${styles.muted}`} role="status">{t("noNurses")}</p>;

  return (
    <>
      <SectionCard id="home-care-nurse" title={t("chooseNurse")}>
        {nurses.length === 1 ? (
          <p className={styles.body}>{nurses[0].name}{nurses[0].detail ? ` · ${nurses[0].detail}` : ""}</p>
        ) : (
          <div className={styles.slots} role="group" aria-label={t("chooseNurse")}>
            {nurses.map((nurse) => (
              <button key={nurse.id} type="button" value={nurse.id} className={styles.choice} aria-pressed={nurse.id === nurseId} onClick={() => setNurseId(nurse.id)}>
                {nurse.name}{nurse.detail ? ` · ${nurse.detail}` : ""}
              </button>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard id="home-care-day" title={t("formDay")}>
        <div className={styles.days} role="group" aria-label={t("formDay")}>
          {days.map((d, index) => (
            <button key={d.iso} type="button" className={`${styles.choice} ${styles.day}`} aria-pressed={d.iso === day} onClick={() => setDay(d.iso)}>
              <span className={styles.dayMeta}>{index === 0 ? t("today") : d.weekday}</span>
              <span className={styles.dayNum}>{d.dateNum}</span>
              <span className={styles.dayMeta}>{d.month}</span>
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard id="home-care-time" title={t("formTime")}>
        {slotsState === "loading" ? <p className={`${styles.body} ${styles.muted}`} role="status">{t("loadingSlots")}</p>
          : slotsState === "failed" ? <p className={styles.error} role="alert">{t("slotsFailed")}</p>
          : slots.length === 0 ? <p className={`${styles.body} ${styles.muted}`}>{t("noSlots")}</p>
          : (
            <div className={styles.slots} role="group" aria-label={t("formTime")}>
              {slots.map((s) => (
                <button key={s.start} type="button" className={styles.choice} aria-pressed={s.start === slot} onClick={() => setPicked(s.start)}>
                  {clock.format(new Date(s.start))}
                </button>
              ))}
            </div>
          )}
      </SectionCard>
      <SectionCard id="home-care-address" title={t("formAddress")}>
        {here ? (
          <>
            <p className={styles.body} role="status">{t("addressLocationSet")}</p>
            <Button variant="outline" fullWidth label={t("addressUseSaved")} onClick={() => setHere(null)} />
          </>
        ) : (
          <>
            {addresses.length > 0 ? (
              <Select label={t("formAddress")} value={addressId} onChange={setAddressId} options={addresses.map((a) => ({ value: a.id, label: a.label }))} />
            ) : (
              <p className={`${styles.body} ${styles.muted}`}>{t("addressNeedsLocation")}</p>
            )}
            <Button variant="outline" fullWidth loading={locating} label={locating ? t("addressLocating") : t("addressUseLocation")} onClick={useMyLocation} />
            {locationError ? <p className={styles.error} role="alert">{t("addressLocationDenied")}</p> : null}
          </>
        )}
        <Link href={`/${locale}/profile/addresses`} className={nursing.addAddress}>{t("formAddAddress")}</Link>
      </SectionCard>
      <SectionCard id="home-care-notes" title={t("formNotes")}>
        <Input value={notes} onChange={(v) => setNotes(v.slice(0, 2000))} multiline rows={3} label={t("formNotes")} />
      </SectionCard>
      <SectionCard id="home-care-pay" title={t("formMethod")}>
        <Segmented label={t("formMethod")} value={method} onChange={(v) => setMethod(v === "insurance" && insurance ? "insurance" : "card")} options={methods.map((m) => ({ value: m, label: t(`method_${m}`) }))} />
        {method === "insurance" ? (
          <>
            {insuranceOnFile?.has ? (
              <dl className={styles.body}>
                <dt>{t("insFetched")}</dt>
                {insuranceOnFile.company ? <dd>{t("insCompany")}: <bdi>{insuranceOnFile.company}</bdi></dd> : null}
                {insuranceOnFile.policy ? <dd>{t("insPolicy")}: <bdi>{insuranceOnFile.policy}</bdi></dd> : null}
              </dl>
            ) : null}
            {noPolicy ? <p className={styles.error} role="alert">{t("insNoPolicy")} <Link href={`/${locale}/insurance/add-policy`} className={nursing.addAddress}>{t("insAddPolicy")}</Link></p> : null}
            <p className={`${styles.body} ${styles.muted}`}>{t("insuranceNote")}</p>
          </>
        ) : price !== undefined ? (
          <p className={styles.body}>{t("visitPrice")}: <bdi>{formatPrice(locale, price).text}</bdi></p>
        ) : (
          <p className={`${styles.body} ${styles.muted}`}>{t("priceAtBooking")}</p>
        )}
      </SectionCard>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <Button fullWidth size="lg" loading={saving} disabled={saving || !slot || (!addressId && !here) || noPolicy} label={saving ? t("formBooking") : method === "card" && price !== undefined ? t("confirmWithAmount", { amount: formatPrice(locale, price).text }) : t("formConfirm")} onClick={() => void submit()} />
    </>
  );
}
