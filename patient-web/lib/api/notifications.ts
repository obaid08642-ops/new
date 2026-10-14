import { z } from "zod";

const notificationIdSchema = z.string().uuid();

export type PatientNotification = { id: string; title?: string; body?: string; priority?: string; createdAt?: string; read?: boolean; type?: string; route?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results, root?.notifications]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function presentationText(record: Record<string, unknown>, key: string) {
  const value = text(record, key);
  return value && !/^notif(?:ication)?\.[a-z0-9._-]+$/i.test(value) ? value : undefined;
}

function notificationFrom(value: unknown): PatientNotification | null {
  const record = asRecord(value);
  const id = notificationIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  return {
    id: id.data,
    title: presentationText(record, "title"),
    body: presentationText(record, "body"),
    priority: text(record, "priority"),
    type: text(record, "type"),
    createdAt: text(record, "createdAt"),
    read: typeof record.read === "boolean" ? record.read : undefined,
    route: text(asRecord(record.action) ?? {}, "route"),
  };
}

export function extractPatientNotifications(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const notification = notificationFrom(item);
    return notification ? [notification] : [];
  });
}

const ROUTE_ID = "[A-Za-z0-9_-]{1,128}";
const WEB_ROUTES: Array<{ app: RegExp; web: (match: RegExpMatchArray, locale: string) => string }> = [
  { app: new RegExp(`^/orders/(${ROUTE_ID})$`), web: (m, l) => `/${l}/orders/${m[1]}` },
  { app: new RegExp(`^/orders/(${ROUTE_ID})/tracking$`), web: (m, l) => `/${l}/orders/${m[1]}/tracking` },
  { app: new RegExp(`^/reports/(${ROUTE_ID})$`), web: (m, l) => `/${l}/reports/${m[1]}` },
  { app: new RegExp(`^/appointments/(${ROUTE_ID})$`), web: (m, l) => `/${l}/appointments/${m[1]}` },
  { app: /^\/consultations\/appointments$/, web: (_m, l) => `/${l}/appointments` },
];

/**
 * A notification carries `action.route`, a route of the mobile app. The web opens it only when the same page exists here
 * (the orders, tracking, reports and appointments pages); any other route (provider jobs, live tracking) returns null and the
 * row just marks the notification as read.
 */
export function webRouteForNotification(route: string | undefined, locale: string): string | null {
  if (!route) return null;
  for (const candidate of WEB_ROUTES) {
    const match = route.match(candidate.app);
    if (match) return candidate.web(match, locale);
  }
  return null;
}
