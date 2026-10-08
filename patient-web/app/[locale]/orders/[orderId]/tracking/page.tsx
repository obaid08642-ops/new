import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Clock3, Hash, MapPinned, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { callPatientApi } from "@/lib/api/upstream";
import { extractOrderTracking, parseOrderId } from "@/lib/api/orders";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorOrders } from "@/components-next/vector-illustrations";
import styles from "../order-detail.module.css";

type Props = { params: Promise<{ locale: string; orderId: string }>; searchParams?: Promise<{ pay?: string | string[] }> };

type TrackingEvent = { label: string; at?: string; note?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstString(record: Record<string, unknown>, fields: string[]): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

// Q30: render the timeline the governed tracking endpoint returns. Every field is
// null-guarded (Q25 crash class): no .map/.toFixed on possibly-undefined values.
function extractTimeline(payload: unknown): TrackingEvent[] {
  const root = asRecord(payload);
  const envelope = asRecord(root?.data);
  for (const source of [envelope, root]) {
    if (!source) continue;
    const candidate = ["timeline", "events", "status_history", "history", "transitions", "states"]
      .map((key) => source[key])
      .find((value): value is unknown[] => Array.isArray(value));
    if (!candidate) continue;
    return candidate.flatMap((entry, index): TrackingEvent[] => {
      if (typeof entry === "string") return entry.trim() ? [{ label: entry }] : [];
      const record = asRecord(entry);
      if (!record) return [];
      return [{
        label: firstString(record, ["state", "status", "label", "stage", "step", "title", "name"]) ?? `#${index + 1}`,
        at: firstString(record, ["at", "updated_at", "updatedAt", "created_at", "createdAt", "timestamp", "date"]),
        note: firstString(record, ["note", "message", "detail", "description"]),
      }];
    });
  }
  return [];
}

export default async function OrderTrackingPage({ params, searchParams }: Props) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || !parseOrderId(orderId).success) notFound();
  setRequestLocale(locale);
  const sp = (await searchParams) ?? {};
  // ?pay=1 is the post-insurance-decision hand-off
  // (pharmacy-insurance-decision-client.tsx:94): land on a working page and confirm it.
  const paid = Array.isArray(sp.pay) ? sp.pay.includes("1") : sp.pay === "1";
  const ar = locale === "ar";
  const t = await getTranslations("Orders");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/orders/${orderId}/tracking`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const payload = await response.json().catch(() => null);
  const tracking = extractOrderTracking(payload);
  if (!tracking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><PackageCheck size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const timeline = extractTimeline(payload);
  const status = tracking.status || t("statusUnavailable");
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/orders/${orderId}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}>
      <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><span className={styles.status}>{status}</span></div>
      <div className={styles.heroVector}><VectorOrders size={75} /></div>
    </section>
    <section className={styles.detail} aria-label={t("title")}>
      <dl className={styles.grid}>
        <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>
        {tracking.pharmacyName ? <div className={styles.item}><dt>{t("pharmacy")}</dt><dd>{tracking.pharmacyName}</dd></div> : null}
        {tracking.deliveryMode ? <div className={styles.item}><dt>{t("deliveryMode")}</dt><dd>{tracking.deliveryMode === "PICKUP" ? t("pickup") : t("delivery")}</dd></div> : null}
        {tracking.etaMinutes !== undefined ? <div className={styles.item}><dt>{t("eta", { value: tracking.etaMinutes })}</dt><dd>{tracking.updatedAt || t("notAvailable")}</dd></div> : null}
        {tracking.total !== undefined ? <div className={styles.item}><dt>{t("total")}</dt><dd>{tracking.total} {tracking.currency || ""}</dd></div> : null}
      </dl>
      <p className={styles.notice}>{t("detailNotice")}</p>
      {paid ? <p className={styles.notice} role="status">{ar ? "تم استلام قرار التأمين — هذه حالة طلبك الحالية." : "Insurance decision received — here is your order's current status."}</p> : null}
      <section aria-label={t("courierTitle")} style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: 8 }}><Truck size={16} aria-hidden="true" />{t("courierTitle")}</h2>
        {tracking.courier ? (
          <dl className={styles.grid}>
            {tracking.courier.name ? <div className={styles.item}><dt>{t("courierTitle")}</dt><dd>{tracking.courier.name}</dd></div> : null}
            {tracking.courier.phoneMasked ? <div className={styles.item}><dt>{t("secureId")}</dt><dd dir="ltr">{tracking.courier.phoneMasked}</dd></div> : null}
            {tracking.courier.lat !== undefined && tracking.courier.lng !== undefined ? (
              <div className={styles.item}><dt><MapPinned size={15} aria-hidden="true" />{t("courierTitle")}</dt><dd dir="ltr">{tracking.courier.lat.toFixed(4)}, {tracking.courier.lng.toFixed(4)}</dd></div>
            ) : null}
          </dl>
        ) : (
          <p role="status" style={{ margin: 0 }}>{t("courierUnknown")}</p>
        )}
      </section>
      <section aria-label={t("slotTitle")} style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: 8 }}><Clock3 size={16} aria-hidden="true" />{t("slotTitle")}</h2>
        {tracking.slot ? (
          <p role="status" style={{ margin: 0 }}>
            {tracking.slot.label ? <strong>{tracking.slot.label}</strong> : null}
            {tracking.slot.start || tracking.slot.end ? <span> — {[tracking.slot.start, tracking.slot.end].filter(Boolean).join(" – ")}</span> : null}
          </p>
        ) : (
          <p role="status" style={{ margin: 0 }}>{t("slotUnknown")}</p>
        )}
      </section>
      <section aria-label={ar ? "الجدول الزمني للطلب" : "Order timeline"} style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: 8 }}><MapPinned size={16} aria-hidden="true" />{ar ? "الجدول الزمني للطلب" : "Order timeline"}</h2>
        {timeline.length === 0 ? (
          <p role="status" style={{ margin: 0 }}>{t("empty")}</p>
        ) : (
          <ol style={{ display: "grid", gap: 8, margin: 0, paddingInlineStart: "1.25rem" }}>
            {timeline.map((event, index) => (
              <li key={index}>
                <strong>{event.label}</strong>
                {event.at ? <span> — {event.at}</span> : null}
                {event.note ? <span> — {event.note}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
      <nav aria-label={t("title")} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Link className={styles.back} href={`/${locale}/orders/${orderId}/offers`}>
          {locale === "ar" ? "عروض الصيدليات" : "Pharmacy offers"}
        </Link>
        <Link className={styles.back} href={`/${locale}/chat`}>
          {locale === "ar" ? "المحادثات" : "Chats"}
        </Link>
      </nav>
    </section>
  </main>;
}
