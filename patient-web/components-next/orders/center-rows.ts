import { extractAppointmentRows } from "@/lib/api/appointments";
import { pickTexts } from "@/lib/i18n/localized";
import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
import { extractNursingVisits } from "@/lib/api/nursing-visits";
import { isPast, modeOf, statusKey as appointmentStatusKey, statusTone as appointmentTone } from "@/lib/consult/appointment-view";
import { diagnosticBookingHref } from "@/lib/diagnostics-links";
import { isPrevious, orderAction, orderNumber, parseLegacyOrderRows, type OrderAction, type OrderRow } from "@/lib/pharmacy/order-view";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { diagStatus } from "@/components-next/diagnostics/status";
import { nursingStatus } from "@/components-next/nursing/nursing-parts";
import { returnStatus, returnTone } from "@/components-next/returns/return-kit";
import { extractReturns } from "@/lib/api/returns";
import { formatMoney } from "@/components-next/pharmacy-offers/format";
import { statusKey as pharmacyStatusKey } from "@/components-next/pharmacy-offers/status";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { statusTone as pharmacyTone } from "./status-tone";

/**
 * The web order center (issue 378): one list of everything the patient asked for, built from what each service's own list
 * endpoint returns, like the app's order center (patient-app/src/utils/orderCenter.ts). Reading only: a field the server
 * did not send is left out. Pharmacy returns are listed too, as in the app (owner decision 31); insurance claims are not a
 * patient feature (owner decision 35 of 2026-10-10), so neither list has them.
 *
 *   GET /patient/pharmacy/orders   pharmacy        GET /care/appointments   consultations
 *   GET /labs/bookings/mine        labs            GET /radiology/bookings/mine   radiology
 *   GET /nursing/visits   nursing visits      GET /pharmacy/returns   returns
 */
export type OrderKind = "pharmacy" | "consultation" | "labs" | "radiology" | "nursing" | "returns";
export type Bucket = "current" | "previous";

/** A row ready to draw: every label is already in the reader's language, so the list needs no translations of its own. */
export type CenterRow = {
  key: string;
  kind: OrderKind;
  href: string;
  icon: FillIconName;
  tone: ServiceTone;
  title: string;
  /** The order number ("#A1B2C3") for a pharmacy order, otherwise the service kind; drawn before the date. */
  meta: string;
  /** ISO instant of the visit, or of the request when the service has no visit time. */
  at?: string;
  statusLabel: string;
  statusTone: ServiceTone;
  bucket: Bucket;
  amount?: string;
  itemsText?: string;
  action: { href: string; label: string };
};

export const KIND_VISUAL: Record<OrderKind, { icon: FillIconName; tone: ServiceTone }> = {
  pharmacy: SERVICE_ICONS.pharmacy,
  consultation: SERVICE_ICONS.consult,
  labs: SERVICE_ICONS.lab,
  radiology: SERVICE_ICONS.radiology,
  nursing: SERVICE_ICONS.nursing,
  // the returns page's own look (app/[locale]/returns/page.tsx)
  returns: { icon: "arrows-left-right", tone: "amber" },
};

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type CenterLabels = {
  orders: Translate;
  offers: Translate;
  consult: Translate;
  appointments: Translate;
  diagWeb: Translate;
  diagnostics: Translate;
  nursing: Translate;
  returns: Translate;
};

/** Where an order's action goes: its page for what can be done next, reordering for a finished order. */
export function actionHref(locale: string, id: string, action: OrderAction): string {
  const encoded = encodeURIComponent(id);
  switch (action) {
    case "reorder": return `/${locale}/pharmacy/reorder?orderId=${encoded}`;
    case "track": return `/${locale}/orders/${encoded}/tracking`;
    case "continue": return `/${locale}/pharmacy/order-confirm?orderId=${encoded}`;
    default: return `/${locale}/orders/${encoded}`;
  }
}

export function pharmacyRows(locale: string, orders: OrderRow[], l: CenterLabels): CenterRow[] {
  return orders.map((row) => {
    const action = orderAction(row.status);
    return {
      key: `pharmacy-${row.id}`,
      kind: "pharmacy",
      href: `/${locale}/orders/${encodeURIComponent(row.id)}`,
      ...KIND_VISUAL.pharmacy,
      title: l.orders("pharmacyOrder"),
      meta: l.orders("orderRef", { number: orderNumber(row.id) }),
      at: row.createdAt,
      statusLabel: l.offers(`status.${pharmacyStatusKey(row.status)}`),
      statusTone: pharmacyTone(row.status),
      bucket: isPrevious(row.status) ? "previous" : "current",
      amount: row.total !== undefined ? formatMoney(locale, row.total, row.currency) : undefined,
      itemsText: row.total === undefined && row.itemCount !== undefined ? l.orders("itemsCount", { count: row.itemCount }) : undefined,
      action: { href: actionHref(locale, row.id, action), label: l.orders(`action.${action}`) },
    };
  });
}

/** The orders of the old flow (GET /orders/mine), listed like the app's order center does: they open the tracking screen. */
export function legacyOrderRows(locale: string, payload: unknown, l: CenterLabels): CenterRow[] {
  return pharmacyRows(locale, parseLegacyOrderRows(payload), l).map((row) => {
    const id = row.key.slice("pharmacy-".length);
    const tracking = `/${locale}/orders/${encodeURIComponent(id)}/tracking`;
    return { ...row, key: `legacy-${id}`, href: tracking, action: { href: tracking, label: l.orders("action.track") } };
  });
}

export function consultationRows(locale: string, payload: unknown, l: CenterLabels): CenterRow[] {
  return extractAppointmentRows(payload).map((appointment) => {
    const mode = modeOf(appointment.serviceType);
    const key = appointmentStatusKey(appointment.status);
    const href = `/${locale}/appointments/${encodeURIComponent(appointment.id)}`;
    return {
      key: `consultation-${appointment.id}`,
      kind: "consultation",
      href,
      ...KIND_VISUAL.consultation,
      title: appointment.doctorName ?? (mode ? l.appointments(`services.${mode}`) : l.appointments("serviceUnavailable")),
      meta: l.orders("kind.consultation"),
      at: appointment.slotStart,
      statusLabel: key ? l.consult(`status.${key}`) : l.appointments("statusUnavailable"),
      statusTone: appointmentTone(appointment.status),
      bucket: isPast(appointment.status) ? "previous" : "current",
      action: { href, label: l.orders("action.details") },
    };
  });
}

const DIAG_DONE = new Set(["report", "cancelled"]);

export function diagnosticRows(locale: string, domain: "labs" | "radiology", payload: unknown, l: CenterLabels): CenterRow[] {
  return extractDiagnosticBookings(payload).map((booking) => {
    const status = diagStatus(booking.state);
    const href = diagnosticBookingHref(locale, domain, booking.id);
    const title = domain === "labs"
      ? pickTexts(locale, booking.testNames) ?? l.diagnostics("labs.label")
      : pickTexts(locale, booking.scanNames) ?? l.diagnostics("radiology.label");
    return {
      key: `${domain}-${booking.id}`,
      kind: domain,
      href,
      ...KIND_VISUAL[domain],
      title,
      meta: l.orders(`kind.${domain}`),
      at: booking.scheduledAt,
      statusLabel: status.key === "unknown" ? l.diagnostics("statusUnavailable") : l.diagWeb(`status_${status.key}`),
      statusTone: status.tone,
      bucket: DIAG_DONE.has(status.key) ? "previous" : "current",
      action: { href, label: l.orders("action.details") },
    };
  });
}

const NURSING_DONE = new Set(["completed", "cancelled", "rejected"]);

export function nursingRows(locale: string, payload: unknown, l: CenterLabels): CenterRow[] {
  return extractNursingVisits(payload, locale).map((visit) => {
    const status = visit.status ? nursingStatus(visit.status) : null;
    const href = `/${locale}/nursing/visits/${encodeURIComponent(visit.id)}`;
    return {
      key: `nursing-${visit.id}`,
      kind: "nursing",
      href,
      ...KIND_VISUAL.nursing,
      title: visit.serviceName || l.nursing("visit"),
      meta: l.orders("kind.nursing"),
      at: visit.scheduledAt,
      statusLabel: status && status.key !== "unknown" ? l.nursing(`status.${status.key}`) : l.orders("statusUnavailable"),
      statusTone: status?.tone ?? "ink",
      bucket: status && NURSING_DONE.has(status.key) ? "previous" : "current",
      action: { href, label: l.orders("action.details") },
    };
  });
}

const RETURN_DONE = new Set(["completed", "rejected"]);

export function returnRows(locale: string, payload: unknown, l: CenterLabels): CenterRow[] {
  return extractReturns(payload).map((item) => {
    const status = returnStatus(item.status);
    const href = `/${locale}/returns/${encodeURIComponent(item.id)}`;
    return {
      key: `returns-${item.id}`,
      kind: "returns",
      href,
      ...KIND_VISUAL.returns,
      title: item.reason || l.orders("kind.returns"),
      meta: l.orders("kind.returns"),
      at: item.createdAt,
      statusLabel: l.returns(`status.${status}`),
      statusTone: returnTone(status),
      bucket: RETURN_DONE.has(status) ? "previous" : "current",
      amount: item.amount !== undefined ? formatMoney(locale, item.amount) : undefined,
      action: { href, label: l.orders("action.details") },
    };
  });
}

/** Newest first; a row without a date goes last, in the order the server sent it. */
export function sortCenterRows(rows: CenterRow[]): CenterRow[] {
  const time = (row: CenterRow) => { const at = row.at ? new Date(row.at).getTime() : NaN; return Number.isFinite(at) ? at : -Infinity; };
  return [...rows].sort((a, b) => time(b) - time(a));
}
