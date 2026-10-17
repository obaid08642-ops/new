# Work queue from 2026-10-17 (review session)

Two build sessions replace the OpenCode sessions. Session S (Sonnet 5.5, effort medium) takes the sensitive work; session H (Haiku 5.5, effort medium) takes everything else. The review session reviews and merges every PR.

Sources for each item: `docs/audit/02_AGENT_EXECUTION_PLAN.md` (Do / Verify per item), `docs/review/GAP_AUDIT_2026-10-16.md`, `docs/product/OWNER_DECISIONS_2026-10-06.md`, `docs/product/ORDERING_MODEL_2026-10-16.md` + `ORDERING_UX_SPEC_2026-10-16.md` (PR #1626), the parity audit in `docs/design/` (#1618).

## Rules for both sessions (binding)
1. Work the list top to bottom without stopping. One item = one branch from `main` (`s/<item>` or `h/<item>`) = one PR. Never branch from another session's branch. Never push to `main`, never force-push, never merge.
2. Before opening each PR: merge `origin/main` into the branch (merge commit), run the checks (backend `npx tsc --noEmit`, the touched specs, `npx jest --config jest.boot.config.js --runInBand test/security test/journeys` when routes change, patient-web/admin `npx tsc --noEmit` + touched tests), and re-read your diff against the item's Do/Verify. Put the real last lines of every check in the PR description.
3. After opening a PR, go straight to the next item. When the review comments on one of your PRs, fix that first, then continue.
4. Live journeys: every new behaviour gets a journey step in `tools/live/`; add the journey to `tools/live/run_gate.sh`. Admin journeys use the D-35 device flow (`enroll_admin_device(admin, email)`, browser device from `j_admin.DEVICE_FILE`).
5. Design rules: colours only from `@nabd/design-tokens` (no new colour), every user-visible text in all six languages (ar, en, ur, hi, bn, fil / tl in the app), RTL for ar/ur. No mock data, no `any` in new code, no edits under `*/acceptance/**`, no skipped or loosened tests.
6. Owner decisions in force: language follows the device (all preferred languages in order; unsupported → English; none, e.g. crawlers → Arabic; the user's choice is remembered; an explicit locale in the URL wins). The built-in admin role grants nothing (decision 29). Admin works only on enrolled devices (D-35). Patients pay only on Nabd Plus pages (Moyasar). Prescriptions are never bypassed.
7. If an item is impossible as written, write `BLOCKED: <reason>` in the PR or a comment and move on.

## Session S (Sonnet 5.5): sensitive work, in this order
1. **D-30 insurance first**: take over PR #1459 (`oc/D-30-fresh`): fix the XSS at `users.insurance.controller.ts:88` (return JSON only, never echo user text), merge main, fix the red checks (backend tests, design tokens, live, CodeQL). The commits `381da2c0` and `42fbaf33` on `oc/CAT-01` belong to D-30; `381da2c0` is already on main (#1646).
2. **19.11 insurance flow**, then **19.3 SCFHS licence check** (must fail closed), **19.7 national address**.
3. **Phase 16 security hardening**: 16.1 secrets, 16.2 passwords, 16.4 headers, 16.5 uploads (AV scan must reject infected files), 16.6 errors/logs (build on #1645 logs), 16.7 supply chain, 16.8 ZAP baseline, 16.9 health-data protection, 16.12 business-logic abuse.
4. **Phase 21 accounts and guests**: 21.1 guest identity, 21.3 guest permission matrix, 21.5 checkout contact + COD cap, 21.7 sessions, 21.8 guest data lifecycle.
5. **Phase 23**: 23.2 covered events (sign-up, login, OTP, order and booking events), 23.6 user-facing history.
6. **Phase 15**: 15.3 optimistic updates only where safe (never for payment/booking state), 15.8 recovery from interruptions (payment and booking first).
7. **Phase 22 sensitive items**: 22.5 order changes, 22.11 fraud.
8. **Ordering model M1–M8** (docs/product/ORDERING_MODEL_2026-10-16.md), only after the owner approves PR #1626 and the design session delivers the M0 boards; until then skip it.

## Session H (Haiku 5.5): everything else, in this order
1. **Gate list without conflicts**: make `tools/live/run_gate.sh` discover journeys (e.g. every `tools/live/j_*.py` that defines `main`, with an explicit skip list and a fixed order file), so parallel PRs stop conflicting on the JOURNEYS line. Keep the special caps (`j_web_call` 60 min) and `j_admin_clicks`.
2. **Language follows the device** (rule 6 above) on the website (`patient-web/proxy.ts`, next-intl routing) and in both apps (`patient-app/src/i18n/LanguageManager.ts`: read every entry of `getLocales()`, not only the first; same in provider-app). Then review the OpenCode branch `oc/P18-port` (Phase 18: 18.1 coverage, 18.2, 18.3 workflow): take what is correct into a PR, but replace its "English default everywhere" with rule 6. Then 18.4 locale formatting, 18.5 copy guide, 18.6 content QA.
3. **Search parity in the app**: the patient app's search boxes get the same instant suggestions as the website (#1654: tiers, highlights, kill switch, debounce 200 ms, abort, min length).
4. **Catalogue**: finish PR #1619 (CAT-0) review notes (ur "جسم کے کرم" → "باڈی کریم"; Filipino first-aid and hair-dryer labels; Latin label_ar rows marked merge), merge main, green. Then the chunk-01 proposal CSVs from `oc/CAT-01` (`data/catalogue-input-01/*.csv` only; none of its code) as their own PR, then chunks 02–21 with the same brief (`docs/review/CATALOGUE_SESSION_BRIEF.md`).
5. **Phase 13**: R4 location privacy, R17 website badge, R19 one product id in all six locales.
6. **Phase 17**: 17.1 navigation (skip link, back-to-top), 17.2 feedback (confirm dialogs, toasts), 17.3 recent/trending searches and the no-results page, 17.4 content helpers, 17.8 accessibility (axe in CI).
7. **Phase 15**: 15.1 one API client per app, 15.5 nothing crashes to a blank screen.
8. **Web/app parity gaps** from the parity audit (#1618), the "broken" and "wrong" rows first, then "missing", then "different".
9. **Phase 22 other items**: 22.1 refill, 22.2 stock/price alerts, 22.3 bundles and alternatives, 22.4 delivery promise, 22.6 appointment quality, 22.7 reviews from real orders, 22.8 help centre, 22.9 documents, 22.10 experiments, 22.12 provider quality, 22.13 release discipline, 22.14 safety, 22.15 growth tools, 22.16 city operations.

## Not in either queue
- Phase 20 (alerts/SLOs, status page, scheduled journeys, restore drill, safe deploys, capacity review) and the Mailjet 401 diagnosis stay with the build session.
- Fix-session PRs #1568, #1591, #1593 stay with the fix session.
- Server and Cloudflare changes go through the server-ops workflow with the owner's Approve; the Cloudflare cache rule for `/api/search/suggest` is prepared by the review session.
