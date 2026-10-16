/**
 * P14.23 real-user monitoring: the page types and metrics the web reports (patient-web/lib/perf/page-type.ts sends
 * exactly these names; a test keeps the two lists equal).
 */
export const RUM_PAGE_TYPES = [
  'home', 'product', 'catalogue', 'doctor', 'doctors', 'article', 'articles', 'lab', 'radiology', 'pharmacy',
  'facility', 'condition', 'service', 'cart', 'checkout', 'orders', 'account', 'auth', 'other',
] as const;
export const RUM_METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export const RUM_RATINGS = ['good', 'needs-improvement', 'poor'] as const;
export const RUM_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
/** Samples are kept 30 days. */
export const RUM_TTL_SECONDS = 30 * 86_400;
/** The plan's budgets (14.23): LCP <= 2.0 s, INP <= 200 ms, CLS <= 0.1, at p75. */
export const RUM_BUDGETS: Record<string, number> = { LCP: 2000, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };
