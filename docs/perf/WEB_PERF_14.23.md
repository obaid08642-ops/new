# 14.23 Web performance: where each part stands

Plan item 14.23 (`docs/audit/02_AGENT_EXECUTION_PLAN.md`), issue #1548. One line per bullet of its "Do", with the PR or
file that carries it. Nothing here is claimed from a lab run that was not made.

| Bullet | State | Where |
|---|---|---|
| Static/ISR entity pages, server components | done before 14.23 | #308 (F82-3): `/p/[slug]`, `/c`, `/doctor/[slug]`, home are static/ISR with public data only; buy bar, cart and session in client components |
| Edge-cached HTML for guests | 14.9 | #1552: Cloudflare worker, fresh nonce per response (`docs/ops/edge-html.md`) |
| `next/image` with `priority` + `sizes` on the LCP image | done | `components-next/pharmacy/product-gallery.tsx` (stage image: `priority`, `sizes="(min-width: 1024px) 480px, 100vw"`); catalogue cards through the optimizer in #1515 |
| Fonts subset per script, `font-display: swap` | done | `app/fonts.ts`: Readex Pro subset to Latin + Arabic and preloaded; Noto faces per script by `unicode-range`, all `swap` |
| Prefetch on intent, never cart/checkout | #1515 | `components-next/nav/nav-link.tsx`, `lib/nav/prefetch-routes.ts` (public routes only, on hover/touch/focus) |
| Speculation Rules (document prerender) | not added, on purpose | Next App Router navigates on the client: a document prerender of a link Next intercepts is never used and costs a full page download. The intent prefetch above is the App Router's equivalent. Pages stay back/forward-cache safe: the stamped HTML is `private, no-cache` (not `no-store`) for guests |
| Third-party scripts after interaction | nothing to move | the only third-party script is Google sign-in (`accounts.google.com/gsi`), loaded on the sign-in screens only. Sentry reports from the server; in the browser it does not run today (Next 16 builds with Turbopack, which reads `instrumentation-client.ts`, absent; `sentry.client.config.ts` is the older webpack hook, and `connect-src` has no Sentry ingest host). Reported, not changed here |
| CI budgets (bytes + Lighthouse, median of 3, devtools throttling) | #1515 | `patient-web/.github/lighthouse-budget.json`, `.lighthouserc.json` (owner decision 45) |
| Per-section skeletons | #1515 / decision 43 | skeletons where a section reads the patient's data; none at the root, so static public pages paint their content at once |
| **Real-user monitoring per page type** | **this PR** | below |

## Real-user monitoring (this PR)

- **Web** (`components-next/web-vitals-reporter.tsx`, in the locale layout): `next/web-vitals` on a quarter of page views;
  LCP, INP, CLS, FCP and TTFB are sent once when the page is hidden, with `navigator.sendBeacon` as `text/plain` JSON
  (no CORS preflight; allowed by `connect-src https://api.nabd.plus`). Sent: the page type (`lib/perf/page-type.ts`,
  19 fixed names), the locale, `mobile`/`desktop`, each metric's value and rating. **No URL, slug, id, cookie or user.**
- **Backend** (`backend/src/modules/rum`): `POST /api/v1/rum/vitals` (public, 60/min per IP, DTO with fixed lists, at
  most 5 samples, `text/plain` parsed for that path only in `main.ts`) stores one document per sample in `rum_vitals`
  (30-day TTL). `GET /api/v1/admin/rum/summary?days=1|7|30` (admin) gives the p75 (`$percentile`, MongoDB 7), the share
  of "good" samples and the plan's budget (LCP 2.0 s, INP 200 ms, CLS 0.1; FCP 1.8 s, TTFB 0.8 s) per page type and metric.
- **Dashboard**: admin → "القيادة والمراقبة" → "أداء الموقع للمستخدمين" (`admin/src/pages/admin/web-vitals.tsx`).
- Tests: `backend/src/modules/rum/rum.spec.ts` (validation, stored fields, TTL, p75 and budget on an in-memory
  MongoDB), `patient-web/tests/page-type.test.ts` (the 19 page types equal the backend's list; path → type).

The 14.23 Verify ("RUM dashboard is live") is met when this is deployed: the page fills from real visits.
