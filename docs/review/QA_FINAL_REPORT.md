# Full-ecosystem QA — final acceptance report (2026-10-02)

**Verdict: NOT READY for release.**
- Two pre-existing Critical/High regressions remain open on the agent tip: **F2** (insurance) and **R23** (step-up).
- This run adds 7 open High items in core flows (Q5 finance ledger, Q16 reorder, Q21 bundle size, Q25 price-override audit, Q30 order tracking, Q36 slot hold, Q38 notification preferences), all delegated with acceptance criteria. What was fixable safely was fixed and is proven by tests and by live re-runs.

## 1. Scope and method

**Code under test.** Agent tip `214c1c5` combined with the reviewer branch `review/qa-full`. The combination is merged locally only and never pushed. The backend ran from that combined build against the QA database `nabd_form2` (Mongo replica set), with Redis, a local S3 (moto) and a fake payment gateway.

**Interfaces.** Four browser-reachable UIs:
- website (Next.js);
- admin (Next.js);
- patient app and provider app as **react-native-web** exports.

The native iOS/Android binaries were **not** run (see §8).

**Tools.**
- Coverage and crawling:
  - inventory: `screen_inventory.py`, `ui_inventory.js`;
  - crawlers with condition-based readiness and failure classes: `web_crawl.py`, `rn_web_crawl.py`, `rn_nav_crawl2.py` (crawler v2);
  - render/not-found sweep: `crash_sweep.py`;
  - real-URL builders for dynamic and flow pages.
- Workflows: 20 API journeys, plus the new `j_concurrency.py`.
- Unit and component tests:
  - Jest/RNTL in both apps (RNTL was newly configured for provider-app);
  - Vitest for the website;
  - Jest for the backend.
- Performance: `perf_web.py` (local + 4G CDP throttling), `api_load.py`, source-map bundle attribution, Mongo profiler.

**Rule applied.** *Rendering alone is never PASSED.* A screen passes only when it rendered without JS errors, failed reads or a not-found state, **and** every control it exposes produced a verified effect.

## 2. Inventory (source of truth: `docs/review/inventory/screens.json`, regenerated at the review tip)

| Interface | Screens / routes | Controls in source |
|---|---|---|
| Patient app | 244 route files (14 dynamic) | 969 pressables, 98 inputs, 16 modals |
| Provider app | 202 navigator registrations over 7 provider types, 129 screen files | 841 pressables, 465 inputs, 12 modals |
| Website | 270 pages (44 dynamic), 77 BFF route handlers | (controls live in components; counted by the crawl) |
| Admin | 65 pages (2 dynamic), 10 BFF files | 288 buttons, 250 inputs |
| Backend | 1,677 HTTP routes, 19 cron jobs, 137 event handlers, 2 queues, 305 collections | — |

**Reuse of earlier evidence.**
- The R1–R83 / F1–F10 registers and the earlier journeys were reused, not repeated: everything already proven green and untouched since was left as is.
- New work targeted gaps:
  - crawler v2 for all 7 provider types;
  - all patient-app and website routes, including dynamic and flow pages with real ids;
  - the admin pages;
  - concurrency;
  - performance.

## 3. Coverage (`docs/review/COVERAGE_MATRIX.md`; every row has a reason and an evidence file)

| App | PASSED | PARTIAL | FAILED | BLOCKED | NOT_TESTED | STALE | Total |
|---|---|---|---|---|---|---|---|
| Provider app | 72 | 109 | 18 | 3 | 0 | 0 | 202 |
| Patient app | 9 | 187 | 40 | 3 | 5 | 0 | 244 |
| Website | 102 | 139 | 17 | 6 | 6 | 0 | 270 |
| Admin | 13 | 41 | 9 | 0 | 2 | 0 | 65 |

**Controls actually exercised**

| App | Controls | Outcomes |
|---|---|---|
| Website | 2,034 (264 routes) | navigate 678, UI change 62, writes 50, disabled 22, guarded destructive 21 |
| Admin | 496 (63 pages) | — |
| Patient app | 2,540 (244 routes) | — |
| Provider app | 3,378 (383 screen states) | — |

**Reading the matrix**
- PARTIAL means the screen rendered cleanly but at least one control had no observable effect (`NO_EFFECT`), such as a tab that only re-renders the same data or a filter on an empty list. It is not a defect by itself.
- Every FAILED row was triaged by hand. It is either a register item (Q/R/F) or listed under *Not defects* in `QA_DEFECTS.md` (crawler limits, junk-input validation, environment).
- BLOCKED means no record exists in the QA data to open the page with (for example, no approved public medicine), or the page needs a context id the test account does not own. Each has a reason in `coverage_overrides.json`.

## 4. Workflows and cross-app

**Journeys.** 19 journeys (accounts, onboarding, pharmacy, lab, radiology, nursing, consultation, ambulance, facility, support, loyalty, payments, insurance, returns, chat, admin ops / sweep / clicks) were run on the combined build.
- Fully green: accounts 42, onboarding 149, ambulance 75, facility 198, support 32, payments 34, chat 83.
- Remaining failures have one of four root causes:
  - **F2** (insurance; 36 steps);
  - **R23** (step-up; 10 steps);
  - **Q18** (the COD policy, switched off by my own crawler on the shared QA DB; re-enabling it needs owner approval);
  - environment (login throttle when crawlers and journeys ran together — re-run alone: green apart from R23).
- Stale journeys were fixed (Q6, Q27).

**Concurrency** (`j_concurrency.py`, barrier-synchronised).
- Holds:
  - one lock per slot;
  - 6 identical submits with one idempotency key give one appointment, every 2xx carries the same id, and there is no 5xx;
  - 4 different slots booked at once all succeed.
- Fails:
  - Q36: a slot hold does not stop another patient from booking;
  - Q37: the slot just before a booking is offered but refused.

**Cross-app contract breaks found**

| Defect | Break |
|---|---|
| Q30 | website tracking → legacy orders |
| Q35 | website proxy allowlist dropped query strings (fixed) |
| Q38 | app notification body vs API shape |
| Q40 | app compare GET vs POST (fixed) |
| Q45 | ambulance profile fields |
| Q42 | provider screens vs role guards |
| Q44 | retired refills endpoint |
| Q25 | admin audit page vs the collection that is actually written |
| R29 | segments DTO |
| R17 | theme CSRF |

**Permissions observed working**
- Another patient's booking → 404.
- Impersonation needs `USER_IMPERSONATE`.
- GDPR create refuses unknown users (Q13).
- Proxy refuses tampered query strings.

## 5. Performance (`docs/review/PERFORMANCE.md`)

**Patient app first load**
- The variable icon font (15 MB) gated the first render. Replaced by its static default instance (1.8 MB, all 3,971 icon ligatures pixel-identical); this is fixed.
- The phosphor barrel import is 42 % of the JS (Q21), and livekit is bundled twice (Q22).
- Critical path, gzip: **9.96 → 2.99 MB** with the fix plus the Q21 prototype.

**Website and admin.** Within budget: FCP on 4G 0.7–1.2 s; JS 130–190 KB.

**Provider app.** 1.54 MB gzip of JS; lazy per-type screens recommended.

**API**
- Every read answered 2xx under load. 140–830 req/s for every read except the doctor list (≈22 req/s, p50 1.1 s at 25 users; N+1, Q41).
- `did-you-mean` (Q14, fixed): p50 at concurrency 10 went from 710 ms to 35 ms.

**Database.** Profiler review: COLLSCAN on pharmacy broadcast recipients, because the unique indexes exist only in manual migration scripts (Q29).

## 6. Defect register (`docs/review/QA_DEFECTS.md`, Q1–Q45)

**Fixed by the reviewer on `review/qa-full`, each with a regression test and a live re-check**
- Q2: crisis-contact phone validation (safety).
- Q10: website address book.
- Q11: website "dose taken".
- Q12: GDPR processing paths.
- Q13: GDPR unknown user.
- Q14: did-you-mean scaling.
- Q17: conditions sitemap.
- Q20: "?" icons.
- Icon font size (performance).
- Q32: every website article page 404.
- Q35: website search and pharmacy chat blocked by the proxy.
- Q40: app medicine compare.

**Tooling defects fixed:** Q6, Q7, Q18, Q19, Q26, Q27.

**Delegated to the agent** (`REVIEW_REAUDIT_P1_P11.md`, Round 7 + addendum, each with Verify criteria)

| Severity | Items |
|---|---|
| High | Q5, Q16, Q21, Q25, Q30, Q36, Q38 |
| Medium | Q4, Q9, Q15, Q22, Q23, Q29, Q31, Q33, Q37, Q39, Q41, Q42, Q44, Q45 |
| Low | Q1, Q24, Q28, Q34, Q43 |
| Still open from earlier rounds | F2, R17, R23, R29 |

**Test-data hygiene:** Q3.

**Corrections I made to my own earlier claims, recorded in the register**
- Q8: dtolint.
- Q33: the first version came from an invalid curl check.
- Q37: buffer direction.
- The broadcast button note.

## 7. Owner decisions needed

1. **Re-enable the platform COD policy in the QA DB.** My crawler switched it off (Q18). The restore was blocked by the session's permission rules.
2. **Run the test-data cleanup.**
   - `python3 tools/live/qa_cleanup.py --since 2026-10-02T15:23:19Z --apply`
   - Dry run: 5,271 documents in 92 collections, 130 test users; manifest in `evidence/qa_cleanup_dryrun_*.json`.
   - Also delete the older crawler junk (Q3 categories, the 4 crawler-published "U…/W…" articles created before that time).
3. **Product decisions:**
   - Q38: the notification key mapping, including marketing consent;
   - Q37: the slot step vs the 5-minute buffer;
   - Q42: which roles get SOS dispatch.
4. **Native CI.** Approve the Maestro-on-GitHub-runners proposal (`NATIVE_CI_PROPOSAL.md`); nothing was enabled.

## 8. Limitations (what this QA does **not** prove)

- **No native runs.** No iOS/Android device, simulator or emulator was available. The apps were tested as react-native-web exports. The following are untested:
  - native-only modules: maps (`codegenNativeComponent` fails on web), camera/scanner, push, biometrics/passkeys, LiveKit calls, background sync;
  - native fonts and layout.
- **Local hardware only.** All performance figures come from a single-process backend in a container, not production. 4G is CDP throttling on desktop Chromium.
- **No production rate limiter.** Load results show no 429 because the local stack runs without the production limiter.
- **QA data is synthetic and sparse.** There is no approved public medicine, no public facility and no promotional offer, so 12 routes are BLOCKED.
- **External services were stubbed or absent:**
  - payment gateway: local fake;
  - storage: local S3 (moto);
  - email: SMTP sink;
  - AI provider: absent, so AI features answer 503;
  - FCM and Resend: keys absent.
- **Crawler limits.**
  - 122 provider controls were `CRAWLER_TARGET_MISSING` (dynamic list rows), and 102 `TAP_FAILED` across apps (icon-only or animated controls). These were counted as untested, not passed.
  - About 45 % of controls had no observable effect (`NO_EFFECT`); these stay PARTIAL.
- **Step-up blocked admin sensitive actions.** Admin refunds, bans, payouts, commissions, loyalty and RBAC could not be exercised end to end through the UI, because step-up (R23) blocks them.
- **Phase-12 code untouched.** The design-track code (`packages/ui-native`) was not changed; Q21 there was only prototyped and measured.
