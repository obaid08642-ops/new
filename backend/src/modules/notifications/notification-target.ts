/**
 * 446: platform-neutral notification targets. The apps send app routes
 * (`action.route`); the web only has pages for some of them. Every listed
 * notification therefore also carries `target: { kind, id }` plus a `web_path`
 * when a web page exists, so the web can open (or route to a list for) each row.
 */

export type NotificationTarget = { kind: string; id: string | null; web_path: string | null };

const ID = '([^/?#]+)';

const RULES: Array<{ re: RegExp; kind: string; web: ((id: string | null) => string | null) | null }> = [
  { re: new RegExp(`^/orders/${ID}/tracking$`), kind: 'order_tracking', web: (id) => `/orders/${id}/tracking` },
  { re: new RegExp(`^/orders/${ID}$`), kind: 'order', web: (id) => `/orders/${id}` },
  { re: new RegExp(`^/reports/${ID}$`), kind: 'report', web: (id) => `/reports/${id}` },
  { re: new RegExp(`^/health/reports/${ID}$`), kind: 'report', web: (id) => `/reports/${id}` },
  { re: new RegExp(`^/consultations/appointments/${ID}$`), kind: 'appointment', web: (id) => `/appointments/${id}` },
  { re: /^\/consultations\/appointments$/, kind: 'appointments', web: () => '/appointments' },
  { re: new RegExp(`^/tracking/lab/${ID}$`), kind: 'lab_tracking', web: null },
  { re: new RegExp(`^/tracking/([^/?#]+)/${ID}$`), kind: '', web: null }, // kind from segment below
  { re: new RegExp(`^/provider/job/${ID}$`), kind: 'provider_job', web: null },
  { re: new RegExp(`^/labs/bookings?/view/${ID}$`), kind: 'lab_booking', web: null },
  { re: new RegExp(`^/labs/bookings/${ID}$`), kind: 'lab_booking', web: null },
  { re: new RegExp(`^/nursing/tracking/${ID}$`), kind: 'nursing_visit', web: null },
  { re: new RegExp(`^/radiology/booking/view/${ID}$`), kind: 'radiology_booking', web: null },
  { re: new RegExp(`^/health/results/${ID}$`), kind: 'health_result', web: null },
  { re: /^\/diagnostics\/results-history$/, kind: 'diagnostics_results', web: null },
];

/** Derive a platform-neutral target from an app action.route (null when unknown/static). */
export function resolveNotificationTarget(route: unknown): NotificationTarget | null {
  if (typeof route !== 'string' || !route.startsWith('/')) return null;
  const path = route.split('?')[0];
  for (const rule of RULES) {
    const m = rule.re.exec(path);
    if (!m) continue;
    if (rule.kind === '') {
      const seg = m[1];
      const id = m[2] ?? null;
      return { kind: `${seg}_tracking`, id, web_path: null };
    }
    const id = m[1] ?? null;
    return { kind: rule.kind, id, web_path: rule.web ? rule.web(id) : null };
  }
  return null;
}
