# Work queue from 2026-10-17 (review session)

Two build sessions replace the OpenCode sessions. Session S (Sonnet 5.5, effort medium) takes the sensitive work; session H (Haiku 5.5, effort medium) takes everything else. The review session reviews and merges every PR.

Sources for each item: `docs/audit/02_AGENT_EXECUTION_PLAN.md` (Do / Verify per item), `docs/review/GAP_AUDIT_2026-10-16.md`, `docs/product/OWNER_DECISIONS_2026-10-06.md`, `docs/product/ORDERING_MODEL_2026-10-16.md` + `ORDERING_UX_SPEC_2026-10-16.md` (PR #1626), the parity audit in `docs/design/` (#1618).

## Rules for both sessions (binding)
1. Work the list top to bottom without stopping. One item = one branch from `main` (`s/<item>` or `h/<item>`) = one PR. Never branch from another session's branch. Never push to `main`, never force-push, never merge.
2. Self-review before every PR (required; it is cheaper than a review round): read the item's Do/Verify again and tick each line against your diff; look for missing translations, raw colours, unused code, tests that do not test the behaviour, and anything the item asked for that you skipped. Then merge `origin/main` into the branch (merge commit), run the checks (backend `npx tsc --noEmit`, the touched specs, `npx jest --config jest.boot.config.js --runInBand test/security test/journeys` when routes change, patient-web/admin `npx tsc --noEmit` + touched tests), and re-read your diff against the item's Do/Verify. Put the real last lines of every check in the PR description.
3. After opening a PR, subscribe to its activity (the `subscribe_pr_activity` tool) and go straight to the next item. When the review session comments on one of your PRs (review comments, a red CI check, a merge conflict), fix that first, then continue. The review session may also add items to this file or send you new instructions as PR comments: they rank above the list.
3a. Files both sessions touch (`patient-web/messages/*.json`, `patient-app/src/i18n/locales/*.json`): keep your additions small and merge `origin/main` again right before opening the PR; the review session resolves any leftover conflict.
3b. **No conflicts, no breakage (owner, 2026-10-18)**. Before you open a PR, and again whenever `main` moves while it is open:
   - **Check the other sessions' open PRs** that touch your files (`repos/obaid08642-ops/new/pulls?state=open`, then each PR's files). If one changes the same function, build on it or wait for it, and say so in your PR.
   - **Merge `origin/main` into your branch** (a merge commit, never a rebase) and resolve every conflict yourself, keeping both sides' behaviour.
   - **Run the WHOLE backend gate**, not only your module: `npx tsc --noEmit`, the full `npm test -- --runInBand`, and the boot suites. Today's breakages were in other modules: append-only `audit_logs` (16.6), two audit rows on an erasure (23.2 with 21.8), the login lockout (16.2 with 23.2), and a test server on a port already used by the chaos proxy (19.7 with j_chaos).
   - **Run your own live journey** against a local stack when you can (`tools/live/start-backend.sh`).
   - **Never commit build output**: `*.tsbuildinfo`, `__pycache__/`, `*.pyc`, `dist/`.
   - **A new test server or port**: grep `tools/live` and `.github` for the port first. The ones in use are 9000 (S3), 2525 (mail), 3311 (ClamAV), 9101 (chaos proxy) and 9102 (Saudi Post).
   - **`.env.example` files and shared workflows**: add your block at the end of its section with your item number, and never rewrite another item's block.
   - **Every GitHub Action** is pinned to a commit SHA (`tools/audit/pin_actions.py --check`).
   - **Security self-check** on every PR: who can call each new route (role or permission), what an anonymous caller sees, what is logged (no personal data), what is cached publicly (never personal data), and the input validators on every DTO field.
   - **Stay with your PR until CI is green**. Read the failing job's log and fix the cause; do not leave a red PR for the review session.
4. Live journeys: every new behaviour gets a journey step in `tools/live/`; do NOT edit `tools/live/gate_order.txt` or `run_gate.sh` for it: since #1655 the gate discovers every `j_*.py` with a `__main__` guard by itself (the order file is only for journeys that must run early; editing its tail makes parallel PRs conflict). A journey that must run after all others goes in `TAIL_JOURNEYS` in `run_gate.sh` (ask the review session). Admin journeys use the D-35 device flow (`enroll_admin_device(admin, email)`, browser device from `j_admin.DEVICE_FILE`).
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
8. **Ordering model, sensitive half (owner approved #1626 on 2026-10-18; plan: `docs/product/ORDERING_MODEL_2026-10-16.md` on main)**: M3 ordering engine (split, payer, matching, time, confirm and pay), M4 ASAP/photo broadcast with auto-accept, M5 insurance per item (after D-30), M7 safeguards (confirm deadline, auto-refund, alternative). Start each only when the review session has posted its acceptance spec (`*/acceptance/ordering-m<n>*`); the non-sensitive half (M1, M2, M8) is Session H's.

## Session H (Haiku 5.5): everything else, in this order
1. **Gate list without conflicts**: make `tools/live/run_gate.sh` discover journeys (e.g. every `tools/live/j_*.py` that defines `main`, with an explicit skip list and a fixed order file), so parallel PRs stop conflicting on the JOURNEYS line. Keep the special caps (`j_web_call` 60 min) and `j_admin_clicks`.
2. **Language follows the device** (rule 6 above) on the website (`patient-web/proxy.ts`, next-intl routing) and in both apps (`patient-app/src/i18n/LanguageManager.ts`: read every entry of `getLocales()`, not only the first; same in provider-app). Then review the OpenCode branch `oc/P18-port` (Phase 18: 18.1 coverage, 18.2, 18.3 workflow): take what is correct into a PR, but replace its "English default everywhere" with rule 6. Then 18.4 locale formatting, 18.5 copy guide, 18.6 content QA.
3. **Search parity in the app**: the patient app's search boxes get the same instant suggestions as the website (#1654: tiers, highlights, kill switch, debounce 200 ms, abort, min length).
4. **Catalogue**: finish PR #1619 (CAT-0) review notes (ur "جسم کے کرم" → "باڈی کریم"; Filipino first-aid and hair-dryer labels; Latin label_ar rows marked merge), merge main, green. Then the chunk-01 proposal CSVs from `oc/CAT-01` (`data/catalogue-input-01/*.csv` only; none of its code) as their own PR, then chunks 02–21 with the same brief (`docs/review/CATALOGUE_SESSION_BRIEF.md`).
5. **Phase 13**: R4 location privacy, R17 website badge, R19 one product id in all six locales.
6. **Phase 17**: 17.1 navigation (skip link, back-to-top), 17.2 feedback (confirm dialogs, toasts), 17.3 recent/trending searches and the no-results page, 17.4 content helpers, 17.8 accessibility (axe in CI).
7. **Phase 15**: 15.1 one API client per app, 15.5 nothing crashes to a blank screen.
8. **Web/app parity gaps**: MOVED to Session F (the fix session) on 2026-10-18; see below.
9. **Open GitHub issues**: MOVED to Session F on 2026-10-18; see below.
10. **Phase 22 other items**: MOVED to Session B (the build session) on 2026-10-18; see below.
11. **Ordering model, H half (owner 2026-10-18)**: M1 provider item model + migration + declaration screens, M2 the doctor's structured medical order + "My medical orders", M8 instant consultation broadcast; M6 (the UI of M1–M5) is the design session's (below). Plan: `docs/product/ORDERING_MODEL_2026-10-16.md` on main. Start each only when its acceptance spec is posted. Anything that moves money or an order's paid state belongs to Session S: stop and write `BLOCKED: needs S` instead.

## Session F (the fix session): moved from H on 2026-10-18, in this order
Rules 1–7 above apply, 3b first. To keep clear of H: F does not change the shared navigation and feedback components that H builds in Phase 17 (`patient-web/components-next/navigation/*`, the confirm dialog and toast components). Where a parity fix needs one of them, F uses it as it is on `main`, or writes `BLOCKED: waits for H 17.x` and moves on. Branches `f/<item>`.
1. **Web/app parity gaps** from the parity audit (#1618), the "broken" and "wrong" rows first, then "missing", then "different".
2. **Open GitHub issues** (23 open on 2026-10-17): after item 8, list them (`repos/obaid08642-ops/new/issues?state=open`), verify each against `main` (close with evidence when already done), fix the rest one PR each; hand any about payments, insurance, booking, security or accounts to session S by commenting on the issue.

## Session B (the build and deploy session): moved from H on 2026-10-18
Rules 1–7 above apply, 3b first. Branches `b/<item>`. B does not touch the ordering-model files (M1–M8 belong to H and S).
1. **Phase 22 other items**: 22.1 refill, 22.2 stock/price alerts, 22.3 bundles and alternatives, 22.4 delivery promise, 22.6 appointment quality, 22.7 reviews from real orders, 22.8 help centre, 22.9 documents, 22.10 experiments, 22.12 provider quality, 22.13 release discipline, 22.14 safety, 22.15 growth tools, 22.16 city operations.

## Design session: M6 (owner 2026-10-18)
M6, the web and app screens of M1–M5, built from the merged M0 boards (`docs/design/canvas/Ord*`). The open questions are answered on #1700. Build each screen once its backend phase (M1, M2, M3…) is merged; until then, only the parts whose endpoints exist on `main`. Rules 1–7 above apply, 3b first. Branches `design/ordering-m6-<screen>`.

## Not in either queue
- Phase 20 (alerts/SLOs, status page, scheduled journeys, restore drill, safe deploys, capacity review) and the Mailjet 401 diagnosis stay with the build session.
- Fix-session PRs #1568, #1591, #1593 stay with the fix session.
- Server and Cloudflare changes go through the server-ops workflow with the owner's Approve; the Cloudflare cache rule for `/api/search/suggest` is prepared by the review session.

## Owner decisions (2026-10-19), binding for Session B (build)
1. **Prescription validity:** the prescriber sets `valid_until` and `refills_remaining` when the prescription is written; a pharmacist may lower them, never raise them. Until a writer exists, refill of a prescription item stays refused (`prescription_validity_unknown`).
2. **Refill and insurance:** a refill checks that the insurance policy is still active; otherwise it is refused with a clear error and self-pay is offered.
3. **Price-drop alert:** measured from the price the patient saw when the item was added to the wishlist (keep the hourly sweep and the 5% threshold).
4. **Delivery promise (22.4):** each pharmacy sets its own delivery time; the courier's location is sent only while an order is out for delivery and is deleted 24 hours after delivery; proof of delivery is a 4-digit code the patient gives the courier; the list of refrigerated medicines comes from the pharmacist (B builds the server side of 4 and 5 first, as the note on 22.4 says).
