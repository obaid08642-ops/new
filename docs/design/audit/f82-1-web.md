# F82-1: web rendering path (patient-web), measurements and findings

Branch `design/f82-1-web`, from `main` at `ab388a13` (includes #291 and the F82 plan). Plan: `docs/review/F82_PERFORMANCE_PLAN.md`.

## How it was measured

- Production build, standalone server, `npm run build` with `NABD_API_BASE_URL=http://localhost:3003/api/v1` (fault proxy in `pass` mode, in front of a seeded backend) and `NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3010`. `rm -rf .next` before every build.
- Lighthouse 12.8 mobile (simulated 4G: 150 ms RTT, 1.6 Mbps, CPU x4), 3 runs per route, **median**. Same machine, no other load, same three routes the CI job audits.
- `/ar/pharmacy` redirects to `/ar/c` (the seeded catalogue is empty), so the "pharmacy" row is the category page in its empty state. Product pages are not-found on this backend: **`/p/[slug]` could not be measured**.
- The first baseline attempt was taken against a stale server left on the port by an earlier session (the build had replaced `.next` under it). It was discarded; every number below was taken after checking that the port was free and the new standalone server answered.

## Before and after (median of 3, mobile)

| Route | | LCP | FCP | TBT | CLS | Script (Lighthouse) | Total | Perf | A11y |
|---|---|---|---|---|---|---|---|---|---|
| `/ar` | before (main) | 3206 ms | 1237 ms | 54 ms | 0.000 | 195.7 KB | 399 KB | 93 | 100 |
| | after | 3045 ms | 1225 ms | 54 ms | 0.000 | 182.5 KB | 344 KB | 94 | 100 |
| `/ar/pharmacy` (to `/ar/c`) | before | 4286 ms | 2384 ms | 20 ms | 0.083 | 177.7 KB | 405 KB | 81 | 100 |
| | after | 3853 ms | 2098 ms | 32 ms | 0.083 | 164.5 KB | 336 KB | 85 | 100 |
| `/ar/consultations/doctors` | before | 3197 ms | 1225 ms | 54 ms | 0.000 | 176.3 KB | 358 KB | 93 | 100 |
| | after | 2911 ms | 1233 ms | 56 ms | 0.000 | 163.1 KB | 300 KB | 95 | 100 |

Individual runs (LCP, ms): `/ar` before 3229 / 3058 / 3206, after 3070 / 3045 / 3038 (a second after-set on the previous commit: 3257 / 3069 / 3056); `/ar/pharmacy` before 4286 / 4354 / 4284, after 3679 / 3971 / 3853 (previous commit: 3903 / 3764 / 3733); doctors before 3190 / 3197 / 3199, after 2911 / 2722 / 2915 (previous commit: 2911 / 2305 / 2888). Run-to-run spread is about 100 to 200 ms, so a change under ~100 ms is not distinguishable from noise.

`tools/design/js-size.mjs` (gz bytes from the network layer, what the 170 KB budget is checked against in review): `/ar` 180.9 to 168.8 KB, `/ar/pharmacy` 151.5 to 140.6 KB, doctors 162.7 to 150.6 KB, `/ar/login` 173.5 to 161.4 KB. Lighthouse counts headers as well and the idle-loaded WebMCP chunk when its window is long enough, so its number is higher (182.5 KB on `/ar`).

Home HTML (server response, `/ar`): 142 KB raw / 32 KB gz to 79 KB / 17 KB gz.

## What each change gave

| Change | Effect measured |
|---|---|
| Client gets only the message namespaces it reads (`lib/i18n/client-messages.ts`, test scans the source) | Home HTML -63 KB raw, -15 KB gz; LCP `/ar` 3206 to 3075, pharmacy 4286 to 4034, doctors 3197 to 3044 |
| `web-mcp-provider` out of the first load (own chunk, loaded a few seconds after `load`, when idle) | -3.5 KB gz from the first-load chunk list; not separable in LCP |
| Precompiled next-intl messages (`precompile: true`; `Specialties.faq` array became a keyed object, 6 locales) | ICU parser (`IntlMessageFormat`) gone from the client, script -10 KB gz on every route; LCP unchanged within noise |
| Readex Pro subset to Latin + Arabic | 78.6 KB to 51.3 KB; screenshots pixel-identical (hinting table kept; a first subset without `prep` shifted anti-aliasing on every route and was redone) |
| Public reads in the Next data cache (config, home content, unfiltered doctors, 60 s) | Not visible locally (backend answers in milliseconds). It removes up to three API round trips from the server render of `/` and `/consultations/doctors` once warm; the real effect is TTFB against `api.nabd.plus` and cannot be shown here |
| `content-visibility: auto` on the Home sections below the first screen | No Lighthouse effect; 25 of 32 screenshots identical, Home differs by 79 to 964 px (see Identity and layout) |
| Product page: one preload (next/image's AVIF/WebP rendition, `fetchPriority="high"`) instead of two | Removes a duplicate download of the original image on every product page; **not measured** (no catalogue data), pinned by `product-page.test.tsx` |

Together: LCP `/ar` -161 ms, `/ar/pharmacy` -433 ms, doctors -286 ms; script -13 KB gz on each route.

## Tried and not shipped (measured, same method)

| Experiment | Result | Why not |
|---|---|---|
| `experimental.inlineCss` (the four render-blocking sheets inline) | FCP 1237 to ~1130-1190 ms, LCP 3700 / 3133 ms (2 runs); HTML 94 KB gz (the CSS is inlined twice, in the document and in the flight payload) | The `<style>` carries **no nonce**: under `style-src 'self' 'nonce-...'` the browser refuses it. Bigger document, no LCP gain |
| Proxy experiment: remove the font preload | LCP 3048 vs 3045 | The font is not what the LCP waits for in the simulation |
| Proxy experiment: no JS | LCP 1679, FCP 1079 | Shows where the time is: the JavaScript |
| Proxy experiment: no JS and no CSS | LCP 1519, FCP 788 | The floor for this document |
| Proxy experiment: the same scripts, injected after `load` + 300 ms | LCP **1840 ms**, FCP unchanged | See "Where the LCP time is". Next gives no hook to delay the bootstrap scripts, and the page would hydrate later; not shippable here |
| Proxy experiment: CSS inlined by hand, nothing else changed | LCP 2428 and 3216 ms (two runs) | Unstable: depends on whether the first paint wins the race against script evaluation |

## Where the LCP time is (honest)

In the simulation, LCP is bounded by the JavaScript that the page fetches before the paint that Chrome observed (about 270 ms in the unthrottled run): React DOM (~70 KB gz), the Next client and router (~43 KB gz) and the app's own client code. Everything the trace shows as finished before that paint is replayed on the throttled network and CPU. Loading the same scripts after `load` gives 1.84 s, and no JS at all gives 1.68 s. So below about 3 s there is no further large step from CSS, fonts or messages; the remaining levers are (a) less client JavaScript on first load (the route's own client components: icons 22 KB, next/image 13 KB, link/intl runtime 16 KB), (b) a way to start hydration after the first paint, (c) fewer, larger chunks. LCP < 1.2 s in this simulation is, as the plan says, a floor that only a static page with inline critical CSS and no blocking JS reaches.

The CI gate (`patient-web/.lighthouserc.json`: LCP 2500 ms, CLS 0.1, TBT 200 ms, perf 0.9, a11y 0.95; `patient-web/.github/lighthouse-budget.json`: script 170 KB, document 140 KB, total 1400 KB, LCP 2500 ms, TBT 200 ms, CLS 0.1) was **not ratcheted**: measured LCP is still above 2500 ms on all three routes (3.0 s, 3.9 s, 2.9 s), so tightening to 1.8 s would only turn a red check redder. No budget was raised and no route removed. The CI baseline in the plan (3.48 / 5.23 / 3.58 s against `api.nabd.plus`) is not comparable with these local numbers (local backend, no TTFB).

## Static or ISR: blocked by the CSP, not done

The CSP is set per request in `proxy.ts`: `script-src 'self' 'nonce-<random>' 'strict-dynamic'` and `style-src 'self' 'nonce-<random>'`. Next applies that nonce while rendering and its own guide says it plainly: with nonces "all pages must be dynamically rendered", static optimisation and ISR are disabled, PPR is incompatible, and dynamic pages cannot be cached by a CDN (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`, "Static vs Dynamic Rendering with CSP"). A prerendered page has inline scripts (`self.__next_f.push(...)`, the theme script) without a nonce, and the browser would refuse them. Giving the cached copy one fixed nonce would defeat the nonce (anyone can read it). The alternatives are a hash-based CSP (the experimental SRI option only covers script files, not the inline flight data) or `'unsafe-inline'` for public pages. Both **change the F68 security policy**, so they are not done here and need the owner's decision.

What the page HTML carries per user today (it must stay out of any shared cache; responses are `Cache-Control: private, no-cache, no-store`, checked on 14 routes): the locale layout reads the access cookie to show `SessionActions` and `PresenceBeacon`, and the Home page reads it to choose between the account link and "sign in" (the sign-in link is the LCP element on `/ar`). To make the shell identical for everyone these two would have to render after hydration, with a visible swap for signed-in users. Not done, because it adds layout shift and no lab gain while the CSP keeps the pages dynamic.

What was done instead, inside the CSP: the document is smaller (17 KB gz), and the public, credential-free server reads are cached in the Next data cache (never a search text, never a credential), which is where the render's TTFB goes.

## Identity and layout

- No colour, logo, pattern or shape added. `tokens.json` unchanged (`git diff origin/main -- packages/design-tokens/tokens.json` is empty). `client-token-sync` 918 (baseline 918), `no-raw-color` 8739 (baseline 8739), `no-px-font-size` 256, `no-left-right` 526, `no-large-raster` 0 over 200 KB: none moved.
- Screenshots `docs/design/screenshots/f82-1/{before,after}/` (390 / 768 / 1440 in light and dark in `ar`; `en` and `ur` at 390; Home, login, doctors, pharmacy; anonymous; `before` is main served from its own build). 25 of 32 are pixel-identical. Home differs by 79 to 964 px (maximum channel difference 130 at 390, 6 at 1440): at 390 the 15 px strip under the bottom tab bar where the top of the AI card shows, at 1440 a faint gradient band; both come from `content-visibility: auto` on the sections below the fold. Nothing moved.
- CSP intact: `proxy.ts` and `csp.ts` untouched; 0 `style=` attributes in the server HTML of the 12 Batch 0 routes checked (`/ar`, login, welcome, onboarding x3, register, forgot-password, otp, password-reset, `/en`, `/ur`); every inline executable script carries the nonce (the one without is the JSON-LD data block); 0 console errors.

## Runtime check

`audit/runtime-f82-1-web.md`: 15 Batch 0 routes x normal/empty/error = 45 runs, **0 issues**, 0 console errors, same as before the change.

## Needs review (found while measuring, not fixed here)

1. **`/ar/c` (and so `/ar/pharmacy`), CLS 0.083.** React reveals the streamed content in a batch after the fallback is removed, so for a moment the footer sits right under the header and then moves below the content. The page also uses 10 inline `style=` attributes that the CSP refuses (the hero is clipped at 390 px). Belongs to Batch 1.
2. **`/ar/consultations/doctors`** has 22 inline `style=` attributes, refused by the CSP. Belongs to Batch 2.
3. **Client-side Sentry is not initialised.** `sentry.client.config.ts` is ignored under Turbopack (the build prints the warning); the client has no `instrumentation-client.ts`. Browser errors are not reported. Not in this PR's scope.
4. **After #292** (the `/` and `/dashboard` ErrorState on a backend failure, owner decision 2026-10-06): the public reads are now cached for 60 s, so during a short outage `/` shows the last good data instead of the ErrorState until the entry expires. Re-run the runtime check "error" scenario after merging main.
5. **`Specialties.faq`** changed shape in the six catalogues (array to keyed object), required by the precompiler. Only `consultations/specialties/page.tsx` reads it.

## Could not be measured here

TTFB at the edge, INP, a real Android over 4G, repeat-visit timings, the effect of the data cache against `api.nabd.plus`, and `/p/[slug]` (no catalogue data on the seeded backend). F82-4 (web-vitals beacon and p75) is what proves them.

## Gates

`cd patient-web && npx tsc --noEmit && npx vitest run`: 0 errors, 178 files / 524 tests passed (14 files / 23 tests skipped as before). `cd packages/design-tokens && npm test`: exit 0. `node tools/design/sync-ui-components.mjs --check`: 34 mirrored files up to date. Production build: exit 0.
