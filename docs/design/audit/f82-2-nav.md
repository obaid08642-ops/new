# F82-2: navigation inside the site (patient-web), measurements and findings

Branch `design/f82-2-nav`. Plan: `docs/review/F82_PERFORMANCE_PLAN.md` (owner target: the next page visible in < 200 ms; prefetch links in the viewport or on hover; cached data first, then revalidated). Script: `tools/design/nav-timing.mjs`. Raw output of every run is in the scratchpad of the session; the numbers below are copied from it.

## How it was measured

- Production build (`npm run build`, `rm -rf .next` first), standalone server on :3010, seeded backend behind the fault proxy in mode `pass`. Anonymous visitor, locale `ar`. Playwright + Chromium.
- **Throttling (both stated): CPU x4 and Fast 4G through the DevTools protocol: 9 Mbps down, 1.5 Mbps up, 150 ms RTT.** A phone viewport (390 x 844, touch, real taps) and a desktop viewport (1280 x 800, mouse).
- **Definition of "click to visible"**: from the `click` event on the link to the first animation frame in which the URL is the destination, the destination's `h1` is in the DOM with a box, and nothing is `aria-busy` (the route loading fallback is aria-busy and has no `h1`). Taken inside the page, so a client transition and a full page load are measured the same way. Resolution one frame (16 ms).
- **Conditions**, each in a fresh page load with nothing carried over: `cold` = click as soon as React has hydrated the link; `viewport` = click after the network was quiet for 1.5 s and at least 10 s after `load` (prefetches of the links in view are done); `hover` (desktop) = as `viewport`, then hover 250 ms, then click. Median of 5 samples, min..max in brackets.
- Baseline = `origin/main` at `ab388a13`, built and measured first in the same session, same machine, same script. After = this branch before the merge of `origin/main` (#292). Because main moved, the final merged tree was measured again against itself with full prefetch switched off (see "After the merge").

## Before and after, click to visible (ms, median of 5, CPU x4, Fast 4G)

| link (phone unless noted) | cold, before | cold, after | viewport, before | **viewport, after** |
|---|---|---|---|---|
| Home tile Consultations -> doctors | 639 (531..698) | 613 (480..651) | 429 (427..462) | **119** (113..136) |
| Home tile Pharmacy -> `/c` | 693 (490..713) | 641 (622..672) | 468 (462..487) | **137** (127..149) |
| Home tile Labs -> `/diagnostics` | 907 (862..957) | 1007 (900..1035) | 890 (890..920) | **466** (447..488) |
| Home tile Nursing -> `/nursing/catalog` | 781 (695..881) | 747 (685..861) | 764 (639..777) | **253** (238..260) |
| Tab bar Doctors | 641 (610..674) | 612 (593..655) | 428 (424..428) | **112** (105..144) |
| Tab bar Pharmacy | 667 (459..699) | 618 (609..649) | 462 (441..479) | **136** (129..139) |
| Tab bar Labs | 883 (878..957) | 940 (862..944) | 884 (826..961) | **493** (440..508) |
| Desktop nav Consultations | 631 (608..635) | 603 (571..638) | 421 (412..424) | **99** (94..137) |
| Desktop nav Pharmacy | 629 (608..642) | 594 (586..639) | 451 (443..556) | **129** (117..202) |
| Desktop nav Labs | 908 (862..967) | 831 (809..896) | 794 (774..863) | **464** (452..531) |

Hover (desktop), before to after: Consultations 413 to 93, Pharmacy 444 to 125, Labs 781 to 452.

What this says:
- **Doctors and Pharmacy meet the target** once the page has had a few seconds (a link in view that was prefetched, or hovered): 99 to 137 ms, from 420 to 470 ms.
- **Cold (the very first click, nothing prefetched yet) is unchanged**, 600 to 1000 ms: no prefetch can help a click that comes before it. It is the cost of one server render over a 150 ms RTT link plus the client transition, and is the same as before within noise. The prefetch starts 4 s after `load` (see the cost section for why), so the first 4 s of a visit behave as before.
- **Labs (466 ms) and Nursing (253 ms) do not meet the target.** The page is cached after the change, but its payload is large (the labs hub is a 480 KB document, nursing 346 KB, measured on the server render), and rendering it at CPU x4 is what remains. Same click with the CPU not throttled (CPU x1, same network, 3 runs): doctors 47 ms, labs 101 ms, nursing 70 ms (before the merge). That is page weight, which belongs to the redesign of those pages (batches 3 and 4), not to navigation.
- Not measured, because the seeded backend has no data: doctor card to doctor page, product card to product page, category to list (the doctors, products and categories lists are empty, `/p/<slug>` is not found), and any signed-in page (the run is anonymous; `/labs/book` redirects an anonymous visitor to sign-in, so list-to-detail for labs cannot be timed either).

## After the merge of `origin/main` (#292)

`origin/main` moved (new Home error state, shared section links, messages), so the numbers above, taken on the old base, are the clean before/after. The merged tree was measured again, with the machine shared with other builds (load average 1.4 to 2.7, so slower and noisier than the run above), against the same tree with full prefetch switched off (one line, `isFullPrefetchRoute` returning false, not committed):

| link | viewport, prefetch off | viewport, prefetch on |
|---|---|---|
| Home tile Consultations | 487 (454..540) | 155 (139..175) / 204 (154..213) in a second run |
| Home tile Pharmacy | 493 (478..532) | 209 (175..212) |
| Home tile Labs | 938 (867..958) | 872 (827..898) |
| Home tile Nursing | 799 (688..848) | 440 (397..595) / 594 (449..606) in a second run |
| Tab bar Doctors | 453 (428..471) | 153 (138..182) |
| Tab bar Pharmacy | 461 (455..492) | 187 (149..237) |
| Desktop nav Consultations | 429 (405..434), hover 419 | 132 (119..220), hover 131 |

Same direction and the same ranking as before the merge; absolute numbers are higher under load (Doctors lands near the 200 ms line instead of well under it). CPU x1 on the merged tree: doctors 50 ms, labs 181 ms, nursing 109 ms. Treat the merged table as "the gain holds", not as a second clean benchmark.

## What it costs (extra bytes at idle on `/ar`)

`node tools/design/nav-timing.mjs --prefetch-cost`: what the page fetches after `load` (12 s, then until the network is quiet), median of 3, compressed bytes with headers, same throttling.

| | RSC prefetch requests | RSC bytes | other requests (scripts, styles of the destinations) |
|---|---|---|---|
| phone, before | 25 (22..26) | 62.8 KB (53.5..64.8) | 0 |
| phone, after | 26 (23..31) | 123.6 KB (57.8..158.9) | 8, 57.9 KB |
| desktop, before | 33 (30..39) | 81.2 KB (71.9..100.2) | 0 |
| desktop, after | 35 (34..35) | 95.5 KB (89.5..162.0) | 8, 57.9 KB |

So the extra traffic is about 60 KB of page payload (median; the spread is wide because Next repeats its own prefetch passes a varying number of times) plus 57.9 KB of destination JavaScript and CSS (five scripts, three stylesheets) that the four fully prefetched pages need: **about 120 KB more on a phone, once per visit, starting 4 s after load**. It does not happen on Save-Data or 2G (`navigator.connection`), and never for a signed-in patient's own pages. Hover and touch prefetch (one page) are not counted here.

## Lighthouse mobile (median of 3, production build, simulated slow 4G, CPU x4) and shared JS

`/ar/pharmacy` redirects to `/ar/c`; the catalogue is empty on the seeded backend, so that row is the empty category state.

Variant A started the prefetch right after load; variant B (shipped) starts it 4 s after load. Both are shown because A is what a naive implementation does.

| Route | | LCP | TBT | CLS | Script (Lighthouse) | Total | Perf | A11y |
|---|---|---|---|---|---|---|---|---|
| `/ar` | before | 3202 ms | 51 ms | 0.000 | 195.7 KB | 401 KB | 93 | 100 |
| | A: right after load | 3337 ms | 102 ms | 0.000 | **240.4 KB** | 537 KB | 91 | 100 |
| | **B: 4 s after load** | 3381 ms | 62 ms | 0.000 | 198.8 KB | 405 KB | 92 | 100 |
| `/ar/pharmacy` | before | 4302 ms | 22 ms | 0.083 | 177.7 KB | 403 KB | 81 | 100 |
| | B | 4309 ms | 10 ms | 0.083 | 178.6 KB | 402 KB | 81 | 100 |
| `/ar/consultations/doctors` | before | 3190 ms | 56 ms | 0.000 | 176.3 KB | 358 KB | 93 | 100 |
| | B | 2742 ms | 53 ms | 0.038 | 177.3 KB | 358 KB | 96 | 100 |

Individual runs (LCP ms, TBT ms, CLS): `/ar` before 3652/93/0.089, 3181/44/0, 3202/51/0; B 3396/55/0, 3070/62/0, 3381/66/0. Doctors before 3169/46/0.038, 3201/56/0, 3190/57/0; B 3180/49/0.038, 2742/54/0.038, 2428/53/0.038. The run-to-run spread of LCP is about 400 ms on `/ar` in the same configuration and a CLS of 0.038 or 0.089 shows up in the baseline too, so **a change under that is not measurable here: no regression and no improvement is claimed for LCP or CLS.** The structural reason is that nothing new is requested before the 4 s mark. The A column is the reason for the delay: started right after load, the prefetched destination chunks showed up as +45 KB of script and +50 ms of TBT in the audit.

`tools/design/js-size.mjs` (gz, first 2.5 s after load): `/ar` 180.9 to 182.9 KB, `/ar/pharmacy` 151.5 to 152.4 KB, doctors 162.7 to 163.6 KB, `/ar/login` 173.5 to 173.6 KB. The shared chunks are byte-identical (70.2, 43.1, 12.0 and 9.9 KB); the growth is the new `NavLink` module in the route chunks that use it (+0.9 KB on the routes that load it, +2.0 KB on Home, which also has the tab bar hook, `SoftLinks`). The 170 KB budget was already exceeded on `/ar` and was not touched. These two runs were taken on the old base, before the merge.

## What changed

1. **Prefetch the main routes in full** (`components-next/nav/nav-link.tsx`, `use-route-prefetch.ts`, `lib/nav/prefetch-routes.ts`). Next's default prefetch of a dynamic route stops at its loading boundary (here the generic `[locale]/loading.tsx`), so a click still waited for a server render: that was the 430 ms. With a full prefetch the page's render is in the router cache before the click.
   - **Viewport tier**: Home tiles for the four sections, the section nav in the Home and core shells, "see all doctors": the page is fetched once the browser is idle, 4 s after `load`.
   - **Intent tier** (the default of `NavLink`): other tiles, category cards, product cards: fetched on hover, touch or keyboard focus.
   - **Tab bars** are buttons calling `router.push`, which Next never prefetches: `useRoutePrefetch` fetches their pages with `router.prefetch` at the same moment.
   - **Plain `<a>`**: the doctor card of the shared design components renders an `<a href>`, which was a full page load. `SoftLinks` (a list wrapper) turns its clicks into client transitions and prefetches on hover, touch and focus.
   - Nothing in the app had `prefetch={false}` (a test pins it).
2. **Only public routes are fetched in full** (`isFullPrefetchRoute`): the doctors list and page, `/c` and its categories, `/p/<slug>`, `/diagnostics/labs`, `/nursing/catalog`, `/map`, `/articles` and an article. `/diagnostics` only for a visitor without a session (signed in, it lists the patient's bookings). A test reads the page files behind the list and fails if one reads the session or writes. Everything per-patient (dashboard, cart, orders, profile, bookings, home-care, chat) keeps Next's default (shell only). The cache is the router's own, in this tab's memory, per session.
   - The core shell does not know the session, so it assumes one and leaves the diagnostics hub out.
3. **Cached first, then revalidated** (`stale-while-revalidate.tsx`, `revalidate-stale.tsx`): the five public list pages carry `<StaleWhileRevalidate />`. A page that the router served from its cache (rendered more than 5 s earlier, clock skew tolerated) calls `router.refresh()` once; scroll and client state stay. A page that came in the document, or was just rendered, does nothing. Cached entries live for Next's `staleTimes.static` (5 minutes, unchanged); the click served at 70 s after load was as fast as at 10 s (131 to 166 ms, checked).
4. **Client-fetched list**: `lib/swr-lite.ts` (a `Map`) keeps the last response of the public providers list for the map page, so it shows at once when opened again and the request replaces it. Memory only (no localStorage, sessionStorage or cookie; a test pins it), public data only, cleared by both sign-out buttons. No library: `swr` and `react-query` were not added.
5. **Prefetch is read-only**: with an anonymous run, the backend log during the 14 s after loading `/ar` shows only `GET` of public endpoints (`care/doctors`, `config`, `content/home`, `labs/services`, `labs/packages`, `radiology/services`, `nursing/catalog`); the browser made no non-GET request; no `/auth` or presence call.

Files touched outside the new ones: Home and core shell, the Home parts, the premium product card, the five list pages (an import and one element each, no style change; they belong to batches 1 to 4 and keep their own colours), the map client, two sign-out buttons, three SSR tests (their `next/navigation` mock gained `useRouter`, since the page tree now contains a client component that uses it; no assertion changed).

## Identity and security

- No colour, logo, pattern or shape added; `tokens.json` untouched. Baselines: `client-token-sync` 918 (baseline 918), `no-raw-color` 8738 (8738), `no-literal-ui-string` 6465 (6465): none moved. No new user-visible text.
- CSP untouched (`proxy.ts`, `csp.ts`). `/ar` and `/en`: 0 `style=` attributes in the server HTML, 0 console errors. The five list pages (doctors, `/c`, labs, map) still carry the inline styles of their old markup that the CSP refuses (22, 10, 999 and 2 attributes), exactly as on main (logged under F82-1 Needs review); this change adds none.
- No token, cookie or medical data in browser storage.

## Runtime check

`audit/runtime-f82-2-nav.md`: 15 Batch 0 routes x normal/empty/error = 45 runs, **0 issues**, 0 console errors, on the merged tree.

## Not measured, and why

- A real phone (CPU and radio), edge TTFB, INP, repeat visits, a signed-in session, and the 2G / Save-Data behaviour (code only).
- Doctor, product and category cards, because the seeded backend has no public doctors or products.
- The first 4 s of a visit by design (cold column).
- Lighthouse and the clean before/after were taken on the base before #292; after the merge only the controlled prefetch-on/off comparison, gates and runtime check were run.

## Needs review

1. **The cold click is still 600 to 1000 ms.** The only way to improve it is a faster server render or a shell with the data streamed in (static/ISR pages), which is blocked by the per-request CSP nonce (F82-1 audit, "Static or ISR"; the reviewer is on the hash-based CSP).
2. **Labs hub and Nursing catalog pages are 480 and 346 KB of HTML.** Cached, they still take 250 to 470 ms to show at CPU x4. Page weight, for batches 3 and 4.
3. The prefetch starts 4 s after load. If the owner wants it earlier, it costs LCP/TBT in the Lighthouse run (variant A above).
4. `Date.now()` in `StaleWhileRevalidate` and a client clock far from the server's: a client more than 1.5 s behind refreshes every cached page (harmless), one far ahead cannot tell a stale page from a fresh one only within 5 s. No action needed.
5. `router.prefetch(href, { kind: "full" })` uses the `PrefetchKind` enum from a Next internal path (type import only; the public type requires it). A Next upgrade that renames it fails `tsc`.
