/**
 * R5: a route CLASS says what kind of work a request is, so the SLO can differ by class (a payment must stay fast and correct under load, a report may be slow)
 * and the dashboards show Rate / Errors / Duration for ~8 classes instead of ~hundreds of route patterns. The first path segment after /api/v1 decides.
 * The p95 targets are PROPOSALS (same 500 ms as the current global rule for the user-facing classes, looser for search/admin/realtime, tighter for payment
 * and auth); they feed the Prometheus rules in ops/prometheus. The in-process SloAlertsService still pages on the old per-group 500 ms rule until the owner
 * approves these numbers.
 */
export type RouteClass = 'payment' | 'auth' | 'booking' | 'search' | 'public_read' | 'user_read' | 'realtime' | 'admin' | 'other';

export const ROUTE_CLASSES: Record<RouteClass, { p95_ms: number; availability: number; segments: string[] }> = {
  payment:     { p95_ms: 400,  availability: 0.9995, segments: ['payments', 'moyasar', 'finance', 'billing', 'refunds', 'wallet', 'coupons', 'checkout'] },
  auth:        { p95_ms: 400,  availability: 0.999,  segments: ['auth', 'otp', 'session', 'sessions', 'devices'] },
  booking:     { p95_ms: 500,  availability: 0.999,  segments: ['orders', 'care', 'appointments', 'labs', 'radiology', 'home-care', 'nursing', 'pharmacy', 'ordering', 'slot-locks', 'unified-bookings', 'cart', 'insurance', 'insurance-engine'] },
  search:      { p95_ms: 800,  availability: 0.99,   segments: ['search', 'seo-search', 'medicines', 'catalog', 'catalogs', 'suggest'] },
  public_read: { p95_ms: 300,  availability: 0.999,  segments: ['health', 'content', 'public', 'i18n', 'sitemap', 'geo', 'doctors', 'providers', 'services'] },
  user_read:   { p95_ms: 500,  availability: 0.999,  segments: ['users', 'me', 'profile', 'notifications', 'loyalty', 'chat', 'family', 'records', 'prescriptions'] },
  realtime:    { p95_ms: 1000, availability: 0.99,   segments: ['livekit', 'calls', 'realtime', 'socket.io', 'sse'] },
  admin:       { p95_ms: 1500, availability: 0.99,   segments: ['admin'] },
  other:       { p95_ms: 800,  availability: 0.99,   segments: [] },
};

/** First path segment after /api and /vN (same rule as the SLO alert service's routeGroup; not imported from there to keep metrics.service free of a cycle). */
function firstSegment(route: string): string {
  const parts = route.split('/').filter(Boolean);
  if (parts[0] === 'api') parts.shift();
  if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
  return parts[0] ?? '';
}

const BY_SEGMENT = new Map<string, RouteClass>();
for (const [cls, def] of Object.entries(ROUTE_CLASSES) as Array<[RouteClass, (typeof ROUTE_CLASSES)[RouteClass]]>) {
  for (const s of def.segments) BY_SEGMENT.set(s, cls);
}

/** `/api/v1/payments/:id/verify` -> 'payment'. Anything unlisted is 'other' (visible in the dashboard, so a new area gets a class on purpose). */
export function routeClass(route: string): RouteClass {
  const seg = firstSegment(String(route || ''));
  return BY_SEGMENT.get(seg) ?? 'other';
}
