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
- **Mongo profiler review.** Level 1 was on during the QA runs; a container restart reset it to level 0, which left 58 slow entries.
  - Almost all are indexed point reads or inserts (1–7 documents) taking 50–400 ms while three crawlers and the journeys shared the container. That is contention, not query plans.
  - Plan problems found:
    1. `pharmacy_broadcast_recipients` upsert by `{broadcast_id, pharmacy_account_id}` is a COLLSCAN: the collection has only `_id`, see **Q29**. It grows with every order × nearby pharmacy, so it degrades linearly, and the missing unique index also removes the duplicate guard the code relies on.
    2. The admin `topSearched` aggregation groups the whole `search_queries` collection (COLLSCAN). This is the same pattern as Q14; recommendation: a 90-day window plus the `createdAt` index that Q14 added.
    3. `lab_services` list (101 docs, COLLSCAN): a catalog, fine at this size.
  - The profiler is off now (level 0); nothing to clean up.

## 3. Website and admin

The crawler records `time_to_ready_ms` per page (condition-based: no in-flight request, no spinner, DOM stable). The website p50 is about 0.9 s locally.

Note: a crawler bug (Q19) made pages from `/ar/maternity/baby-development` on report 15 s. That was the harness, not the site; it is fixed and those pages were re-crawled at under 1 s.
