# Performance audit (QA-5)

All measurements were taken on the review container: Chromium plus the local stack. **This is not a phone.** "4G" is Chrome CDP throttling (1.6 Mbps down, 150 ms RTT, 4× CPU) and is only a rough mid-range approximation. The local SPA server does not compress, so gzip sizes are listed next to raw sizes; a production CDN would serve the gzip/brotli figure.

Tools:
- `tools/live/perf_web.py` (page load: TTFB/FCP/LCP/long tasks, `BASE=` to compare two builds);
- `tools/perf/instance_icon_font.py`;
- the source-map attribution in `docs/review/evidence/bundle_patient-app_2026-10-02.json`;
- `/tmp/e2e/perf_dym.py` (API load, Q14).

## Budgets (proposed)

| Item | Budget | Current | Status |
|---|---|---|---|
| Patient app web: JS on the first screen (gzip) | ≤ 1.5 MB | 3.39 MB | over |
| Patient app: fonts the first render waits for (gzip) | ≤ 0.8 MB | 6.9 MB (icon font 6.56 MB) | over → **fixed** (1.0 MB) |
| Website: page ready, p50, local | ≤ 1.5 s | ~0.9 s (crawl v2 `time_to_ready_ms`) | within |
| Public search API (`did-you-mean`), p50 at concurrency 10 | ≤ 100 ms | 710 ms → 35 ms | **fixed** (Q14) |
| Main-thread long tasks on the first load, local | ≤ 500 ms | 472 ms | at the limit |
| Website / admin: FCP on 4G | ≤ 1.5 s | 1.17–1.19 s / 0.70 s | within |
| Provider app web: JS gzip | ≤ 1.0 MB | 1.54 MB | over (recommendation: per-provider-type lazy screens) |
| API list/search reads: p95 at 25 concurrent users | ≤ 150 ms (production hardware) | 55–340 ms locally; doctor list 1.43 s | doctor list over (Q41) |

## 1. Patient app, first load (web build; the same assets ship in the native binaries)

**Finding A: icon font (fixed on `review/qa-full`)**
- `assets/fonts/MaterialSymbolsRounded.ttf` is the full variable font: 15.05 MB (6.56 MB gzip).
- `app/_layout.tsx` renders nothing until every font has loaded, so this file sat on the critical path of the first screen.
- React Native never sets variation axes, so only the default instance is ever drawn.
- The fix is the static default instance: 1.76 MB (0.63 MB gzip), with every glyph and the ligature table kept.
- Proof: all 3,971 icon ligatures were rendered in Chromium with both files, and **0 pixels differ**. The control (no font loaded) differs by 1.47 M pixels, so the font really rendered.
- Guard: `patient-app/__tests__/icon-font.test.ts` (static, GSUB kept, ≤ 2.5 MB). It fails on the old file.

**Finding B: phosphor icon set (delegated, Q21)**
- `phosphor-react-native` is 5.74 MB, **42 %** of the 16.19 MB JS entry.
- `packages/ui-native/src/Icon.tsx` does `import * as phosphor` and uses 29 icons. Metro does not tree-shake, so all ~1,500 icons × 6 weights are bundled.
- Prototype (built, measured, then reverted, since this file belongs to the phase-12 design track): per-icon imports from `phosphor-react-native/src/icons/<Name>`, an entry point the package itself exports.

**Finding C: livekit (delegated, Q22)**
- `livekit-client` is in the entry **twice**, as `esm.mjs` and `umd.js` (1.08 MB together), and is loaded on app start although only the video-call screens use it.

Measured, same route `/`, same backend; before = current build, after = A + B prototype:

| | before | after | change |
|---|---|---|---|
| Entry JS, raw / gzip | 16.19 MB / 3.39 MB | 10.39 MB / 2.36 MB | −36 % / −30 % |
| Icon font, raw / gzip | 15.05 MB / 6.56 MB | 1.76 MB / 0.63 MB | −88 % / −90 % |
| Critical path, JS + icon font (gzip) | 9.96 MB | 2.99 MB | **−70 %** |
| Local: transfer, FCP | 31.4 MB, 1,032 ms | 12.8 MB, 828 ms | −59 %, −20 % |
| 4G, uncompressed: DOMContentLoaded (JS only, fonts not yet requested) | 83.2 s | 53.9 s | −35 % |
| Long tasks, 4G | 2,404 ms | 1,980 ms | −18 % |

- The home screens of both builds were compared after loading: identical apart from anti-aliasing under the translucent bars (692 px).
- Rough download time of the critical path at 1.6 Mbps with gzip: about 50 s → about 15 s.

Evidence:
- `evidence/perf_patient-app_2026-10-02_bundle_{before,after}.json`
- `evidence/perf_patient-app_2026-10-02_4g_bundle_{before,after}.json`
- `evidence/bundle_patient-app_2026-10-02.json`

## 2. API

- **Q14 `did-you-mean`** (fixed), measured with 200k synthetic `search_queries` rows (deleted afterwards):

  | Concurrency | Before | After |
  |---|---|---|
  | 1, p50 | 164 ms | 5 ms |
  | 10, p50 | 710 ms | 35 ms |
  | Throughput | 13.8 rps | 282 rps |

  A cache miss after the fix takes about 111 ms. Evidence: `evidence/perf_q14_did_you_mean_2026-10-02.json`.
- **API load baseline** (`tools/perf/api_load.py`, 200 requests per endpoint per level, keep-alive, signed in as the seeded patient; single backend process on the review container while one provider crawler was running; `evidence/api_load_2026-10-02.json`). Every one of 6,000 requests answered 2xx; no 429 was seen (the local stack runs without the production rate limit).

| Endpoint | c=1 p50 / p95 ms | c=10 p50 / p95 ms | c=25 p50 / p95 / p99 ms | max req/s |
|---|---|---|---|---|
| `/care/specialties` | 4.4 / 7.6 | 26.7 / 59.0 | 47.1 / 139.7 / 268.9 | 373.9 |
| `/care/doctors` (q) | 83.2 / 143.0 | 456.8 / 561.7 | 1128.9 / 1429.5 / 1652.3 | 21.9 |
| `/care/doctors/:id/slots` | 8.6 / 16.0 | 56.6 / 77.5 | 132.4 / 249.7 / 458.7 | 170.3 |
| `/articles` (q) | 3.0 / 6.4 | 23.4 / 37.3 | 33.5 / 197.2 / 361.8 | 382.8 |
| `/medicines/search/did-you-mean` (q) | 1.8 / 4.8 | 11.6 / 26.9 | 18.6 / 54.8 / 105.7 | 827.1 |
| `/content/home` | 4.1 / 6.2 | 31.1 / 133.4 | 51.4 / 146.7 / 308.3 | 344.8 |
| `/users/me/profile` | 5.6 / 8.5 | 37.6 / 49.5 | 88.9 / 190.8 / 405.1 | 250.6 |
| `/home/search` (q) | 8.4 / 13.4 | 60.9 / 145.7 | 133.8 / 303.4 / 583.4 | 150.8 |
| `/patient/pharmacy/orders` | 6.6 / 11.4 | 41.9 / 62.7 | 98.8 / 231.0 / 437.0 | 217.0 |
| `/care/appointments` | 8.0 / 13.2 | 56.0 / 72.5 | 144.7 / 339.7 / 689.8 | 166.6 |

  - The outlier is the doctor list: about 22 req/s at most, and p50 1.1 s at 25 concurrent users, against 140–830 req/s for every other read. Cause: N+1 next-availability per doctor (**Q41**).
  - Budget proposal for the search/list reads: p95 ≤ 150 ms at 25 concurrent users on production hardware.
  - Under that load, `content/home`, `home/search`, `care/appointments` and `patient/pharmacy/orders` have p99 between 300 and 700 ms. Re-measure on the production instance size before deciding.
- **Mongo profiler review.** Level 1 was on during the QA runs; a container restart reset it to level 0, which left 58 slow entries.
  - Almost all are indexed point reads or inserts (1–7 documents) taking 50–400 ms while three crawlers and the journeys shared the container. That is contention, not query plans.
  - Plan problems found:
    1. `pharmacy_broadcast_recipients` upsert by `{broadcast_id, pharmacy_account_id}` is a COLLSCAN: the collection has only `_id`, see **Q29**. It grows with every order × nearby pharmacy, so it degrades linearly, and the missing unique index also removes the duplicate guard the code relies on.
    2. The admin `topSearched` aggregation groups the whole `search_queries` collection (COLLSCAN). This is the same pattern as Q14; recommendation: a 90-day window plus the `createdAt` index that Q14 added.
    3. `lab_services` list (101 docs, COLLSCAN): a catalog, fine at this size.
  - The profiler is off now (level 0); nothing to clean up.

## 2b. Page load per app (Chromium, cold load, median of 3 local / 1 on 4G)

| App · route | Local: FCP / LCP / long tasks | 4G (CDP): FCP / load | JS transferred |
|---|---|---|---|
| Website `/ar` | 272 / 272 / 0 ms | 1.19 s / 2.46 s | 188 KB |
| Website `/ar/doctors` | 224 / 224 / 53 ms | 1.17 s / 2.50 s | 164 KB |
| Website `/ar/articles`, `/ar/consultations`, `/ar/pharmacy` | 236–256 ms FCP | — | 159–166 KB |
| Admin `/login` | 124 / 124 / 0 ms | 0.70 s / 1.38 s | 131 KB |
| Provider app `/` (web build) | 496 / 616 / 302 ms | 32.4 s / 32.2 s (uncompressed) | 5.9 MB raw, **1.54 MB gzip** |
| Patient app `/` (web build) | see §1 | see §1 | 16.2 MB raw → 10.4 MB with the fixes |

- The two Next.js apps are within budget: FCP ≤ 1.5 s on 4G and JS ≤ 300 KB.
- Both Expo apps are dominated by the single JS entry. That matters on the web, and for native start-up and parse time.
- The provider app does not bundle phosphor; its 1.54 MB gzip is its own code plus React Native Web. A bundle split (lazy screens per provider type: a pharmacy user never needs the radiology screens) is the next step, as a recommendation.
- Evidence: `evidence/perf_{website,admin,provider-app}_2026-10-02[_4g].json`.

## 3. Website and admin

The crawler records `time_to_ready_ms` per page (condition-based: no in-flight request, no spinner, DOM stable). The website p50 is about 0.9 s locally.

Note: a crawler bug (Q19) made pages from `/ar/maternity/baby-development` on report 15 s. That was the harness, not the site; it is fixed and those pages were re-crawled at under 1 s.
