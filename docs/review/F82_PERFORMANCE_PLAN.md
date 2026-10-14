# F82: performance plan (owner targets, 2026-10-05)

## Targets (owner)

The owner set these targets, measured on a real mid-range Android over 4G, and in Lighthouse mobile.

| | Target |
|---|---|
| First visit, mobile | LCP < 1.2 s, TTFB < 200 ms, CLS < 0.05, INP < 150 ms |
| First visit, desktop | LCP < 0.8 s |
| Navigation inside the site | next page visible in < 200 ms (prefetch links in the viewport or on hover; cached data shown first, then revalidated) |
| Repeat visit | < 0.5 s (static/ISR pages cached at the Cloudflare edge, long-cache hashed assets, service worker for the shell) |
| App | screens open at once from cached data (stale-while-revalidate), with the next likely screen prefetched |

## Baseline ("before")

Lighthouse mobile in CI: the `lighthouse` job on #291 head `5fab5997`, 2026-10-05, production build, `next start`.

| Route | LCP | Script (gz) | Notes |
|---|---|---|---|
| `/ar` | 3.48 s | 196 KB | |
| `/ar/pharmacy` | 5.23 s | 178 KB | redirects to `/ar/c…` |
| `/ar/consultations/doctors` | 3.58 s | 176 KB | |

What the reports already show (#291 analysis):
- Three render-blocking stylesheets, about 28 KB gz.
- The React/Next runtime, about 113 KB gz.
- The next-intl ICU parser, about 12 KB.
- `web-mcp-provider`, 3.4 KB, on every page.
- The CI build renders against `https://api.nabd.plus`, so slow server-side data fetches show up as TTFB.

Not measured yet:
- Real-device numbers.
- TTFB at the edge.
- INP.
- Repeat-visit timings.

## What can be measured where (honest)

- **Lighthouse mobile** simulates a mid-range phone on slow 4G (150 ms RTT, 1.6 Mbps, CPU ×4).
  - It cannot see the Cloudflare edge, because CI serves from `localhost`.
  - An LCP under 1.2 s in that simulation is at the floor of what a page needing HTML, CSS and a font can reach. Only a fully static page with inline critical CSS and a non-blocking font gets there.
  - The CI gate therefore ratchets: 2.5 s → 1.8 s → 1.2 s as each part lands. It is never raised.
- **Real Android over 4G** and **TTFB < 200 ms** are field numbers.
  - They are measured after deploy with real-user monitoring: `web-vitals` (LCP, INP, CLS, TTFB) sent to a small backend endpoint, reported as p75 per route on the admin dashboard.
  - A one-off check on a real phone (Chrome remote debugging) confirms the numbers.
  - Without that endpoint, "real Android" cannot be proven.

## Work, in order (each its own PR, with before/after per route in the PR)

**F82-1 web rendering path** (patient-web, PR to `main`):
- **Rendering:** static or ISR for the public pages (home, categories, product, doctor). User-specific parts render on the client after the shell.
- **CSS and fonts:** inline the critical CSS and remove the render-blocking sheets. Preload the LCP image and the Readex Pro Arabic subset (`font-display: swap`, subset woff2).
- **Images:** responsive AVIF/WebP with `sizes`.
- **Below the fold:** defer it (lazy sections, `content-visibility`).
- **First load:** take `web-mcp-provider` out of it (load after idle), and next-intl's runtime parser (precompiled messages per route).

**F82-2 navigation:**
- Prefetch the links in the viewport and on hover (Next `Link` prefetch, kept on for the main routes).
- Show cached data first, then revalidate (SWR) for list pages.

**F82-3 repeat visit and edge** (ops: the reviewer, rehearsed, with the owner's Approve per run):
- **Cloudflare cache rules:** cache the static and ISR HTML of public pages at the edge, honouring `s-maxage` and `stale-while-revalidate`. Never cache a page or API response that carries a session (X0 rule: no private data at the edge).
- **Nginx headers:** `immutable` with a one-year cache for `/_next/static/*`.
- **Service worker** for the app shell: precache the shell and fonts; network-first for HTML.

**F82-4 real-user monitoring:** the `web-vitals` beacon, a backend endpoint, and p75 per route in admin.

**F82-5 app** (patient-app):
- Cache list and detail responses, and show them at once with stale-while-revalidate.
- Prefetch the next likely screen: Home → services, a doctor list → the first doctor, the cart → checkout.
- Measured with cold and warm start times on a device build.

## Done criteria

- The CI `lighthouse` job is green on the three routes at each step's ratchet.
- The final numbers are LCP ≤ 1.2 s mobile, CLS < 0.05 and TBT ≤ 200 ms, with no budget raised and no route removed.
- Real-user p75 after deploy, from F82-4, meets the owner's numbers on real Android over 4G. Until then, F82 stays open.
- No private data is cached at the edge. The X0 rule is re-checked on every cache change.
