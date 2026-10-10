import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CoreShell } from "@/components-next/core/core-shell";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import { RetryLinkErrorState } from "@/components-next/pharmacy-checkout/state-views";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { getPatientNursingVisits } from "@/lib/api/nursing-visits-server";
import { requirePatientAccess } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { parseOrderRows } from "@/lib/pharmacy/order-view";
import { callPatientApi } from "@/lib/api/upstream";
import { consultationRows, diagnosticRows, nursingRows, pharmacyRows, sortCenterRows, type CenterLabels, type CenterRow } from "./center-rows";
import { OrderList } from "./order-list";
import rx from "@/components-next/pharmacy/rx.module.css";

/** One source of the order center: its rows, or `failed` when the service did not answer (the other services still show). */
async function read(locale: string, load: () => Promise<Response>, build: (payload: unknown) => CenterRow[]): Promise<{ rows: CenterRow[]; failed: boolean }> {
  let response: Response;
  try {
    response = await load();
  } catch {
    return { rows: [], failed: true };
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) return { rows: [], failed: true };
  return { rows: build(await response.json().catch(() => null)), failed: false };
}

/**
 * `/orders`: everything the patient asked for in one place, like the app's order center (issue 378): pharmacy orders,
 * consultations, lab and radiology bookings and nursing visits, newest first, from each service's own endpoint. A service
 * that does not answer is named in a note and the others still show; only when none answers is the page an error.
 */
export async function OrdersScreen({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Orders" });
  const routeState = await getTranslations({ locale, namespace: "RouteState" });
  const labels: CenterLabels = {
    orders: t,
    offers: await getTranslations({ locale, namespace: "PharmacyOffers" }),
    consult: await getTranslations({ locale, namespace: "ConsultWeb" }),
    appointments: await getTranslations({ locale, namespace: "Appointments" }),
    diagWeb: await getTranslations({ locale, namespace: "DiagWeb" }),
    diagnostics: await getTranslations({ locale, namespace: "Diagnostics" }),
    nursing: await getTranslations({ locale, namespace: "NursingWeb" }),
  };
  const token = await requirePatientAccess(locale);

  const sources = await Promise.all([
    read(locale, () => callPatientApi("/patient/pharmacy/orders", {}, token), (payload) => pharmacyRows(locale, parseOrderRows(payload), labels)),
    read(locale, () => getPatientAppointments(token), (payload) => consultationRows(locale, payload, labels)),
    read(locale, () => getDiagnosticBookings(token, "labs"), (payload) => diagnosticRows(locale, "labs", payload, labels)),
    read(locale, () => getDiagnosticBookings(token, "radiology"), (payload) => diagnosticRows(locale, "radiology", payload, labels)),
    read(locale, () => getPatientNursingVisits(token), (payload) => nursingRows(locale, payload, labels)),
  ]);
  const rows = sortCenterRows(sources.flatMap((source) => source.rows));
  const failedCount = sources.filter((source) => source.failed).length;

  let body;
  if (failedCount === sources.length) {
    body = <div className={rx.state}><RetryLinkErrorState title={t("listErrorTitle")} body={t("unavailableBody")} retryLabel={routeState("retry")} /></div>;
  } else if (rows.length === 0 && failedCount === 0) {
    body = (
      <div className={rx.state} role="status">
        <LinkEmptyState icon="pill" tone={PHARMACY_TONE} title={t("emptyTitle")} body={t("emptyBody")} actionLabel={t("browse")} actionHref={`/${locale}/pharmacy`} />
      </div>
    );
  } else {
    body = <OrderList locale={locale} rows={rows} partialNote={failedCount > 0 ? t("partialNote") : undefined} />;
  }

  return (
    <CoreShell locale={locale} title={t("title")} backHref={`/${locale}/profile`} width="narrow">
      <div className={rx.page}>
        <div className={rx.head}><h1 className={rx.title}>{t("title")}</h1></div>
        {body}
      </div>
    </CoreShell>
  );
}
