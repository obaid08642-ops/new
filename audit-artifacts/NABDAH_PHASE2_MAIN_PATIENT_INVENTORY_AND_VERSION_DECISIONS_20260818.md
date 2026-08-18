# Phase 2 — Patient inventory on main and version decisions

## Source policy

`main` is the official default source for this phase. The reconciliation branch is used only as a verification reference. No alternative file is adopted merely because its branch is newer. An exception requires evidence that the file is functionally newer, better integrated with the real Backend contract, safer against synthetic data, and build-compatible.

## Main inventory

The Patient archive from `main=53ba7da` was scanned before any source modification.

| Metric | Main result |
|---|---:|
| TypeScript/JavaScript files scanned | 509 |
| Route/screen candidates | 255 |
| UI action markers | 2,276 |
| API call markers | 825 |
| Files containing API markers | 232 |
| Loading/error/empty/retry state markers | 1,450 |
| Risk markers requiring manual review | 504 |
| Distinct risk file/marker pairs | 220 |
| Backend routes compiled from main | 1,391 |
| Patient API calls extracted from main | 333 |
| Main Patient calls matched by method/path | 285 |
| Main Patient calls in manual review queue | 48 |

The counts are inventory signals, not proof of correctness. A UI action can still be dead, local-only, or connected to an incorrect contract; a matching route can still have wrong DTO, ownership, state, or business semantics.

## Verification comparison with reconciliation archive

The QA Patient archive had 522 source files, 251 route candidates, 754 API markers, 2,878 state markers, and 410 broad risk markers under the same scanner. Its API matcher produced 317 calls, 268 direct method/path matches, and 49 manual-review candidates. The different counts confirm that the archives are not interchangeable, but they do not by themselves establish that QA is globally better.

## File-level decisions

| Feature area | Decision | Rationale and required follow-up |
|---|---|---|
| Medication reminders and notification scheduling | **QA candidate for adoption** | The QA `medication-reminder-add.tsx` supports create/edit, loads existing reminders, validates structured fields, persists via POST/PATCH `/health/reminders`, and synchronizes device notifications. Main has fewer integration signals. Confirm DTO and device-permission behavior in later contract/build tests before replacing the main file. |
| Medication list/health medication screens | **QA candidate, not yet merged** | QA has more API integration in the changed medication screen set; compare DTOs and ownership, then retain main if QA loses any patient-visible feature. |
| Nutrition hub | **Keep main breadth; merge QA data-state pattern later** | Main exposes the broader feature directory. QA adds real `/nutrition/profile` and `/nutrition/daily-summary`, loading/error/retry states, but narrows navigation considerably. Do not replace main wholesale; merge verified data states without dropping feature routes. |
| AI nutrition plan builder | **Keep main feature; BLOCK synthetic/contract activation until verified** | Main contains a complete multi-step flow and POST `/ai/generate-diet-plan` plus `/nutrition/profile`, with real metric validation. QA replaces the route with a redirect and removes the feature. Main is retained as the product feature, but it must be contract-tested and must not display or persist unverified AI output. |
| Maternity hub and pregnancy/cycle tracking | **Keep main breadth; mandatory fail-closed remediation** | Main has the richer planning/checkup/booking journey but contains a synthetic default profile (week 28 and Date.now-derived due date), AsyncStorage fallback, and optimistic local transitions. QA is safer and narrower, loading `/maternity/profile` with explicit empty/error states. Do not adopt QA wholesale; merge the safe state policy into the richer main experience and remove fabricated medical defaults. |
| Diagnostics checkout | **Keep main UX as gated design; do not activate blindly** | Main preserves the full booking/payment experience but locally generates dates/slots and has local radiology questionnaire state. QA redirects fail-closed because provider availability/payment contracts are not proven. Retain main as the intended journey only behind verified availability/payment contracts; no unverified booking is allowed. |
| Mental-health crisis support | **Review/merge** | QA provides explicit real contact CRUD and translated safety states; main offers broader self-help/hotline experience. Preserve safety and breadth only after checking backend contracts and emergency policy. |
| AI, diagnostics, reports, family and health records | **Main default, file-level review required** | Main has broader visible journeys; QA changes several files and may remove or narrow features. Choose per file only after API/DTO/ownership/state comparison. |
| QA-only localization and medication-notification modules | **Adopt as candidates** | These are additive and test-bearing, but must be included only after package/typecheck and translation-key validation. |
| Main-only `.env*`, Google/Firebase files, and `expo-env.d.ts` | **Do not copy secrets** | `.env*` and Firebase credential files are release/environment assets, not source data. Use `.env.example` and secret/release provisioning. Preserve only valid non-secret type/config contracts. |
| Removed backup route files | **Keep removed** | The QA archive’s removal of `*.backup.tsx` files is a correctness improvement because Expo Router can register files under `app/` as routes. |

## Current blockers and non-claims

The phase has not yet closed. The 48 unmatched main Patient calls require manual review. The 504 risk markers require classification into legitimate safety copy, test code, acceptable placeholders, or defects. No source file has been replaced yet because the file-level decisions need DTO, build, and state verification. No production mutation was performed.

## Phase 2 completion gate

Before declaring Phase 2 complete, the remaining Patient inventory must cover every route/screen and action, and every changed feature file must receive a final `MAIN`, `QA`, `MERGED`, or `BLOCKED` decision with evidence. The chosen source set must then pass typecheck/build and route/API smoke validation. Only after that double-check may the phase report be committed and the next phase considered.


## Contract matching refinement

The first route pass overcounted or misclassified routes when one Backend file contained multiple `@Controller` classes. The compiler was corrected to segment every controller separately. The corrected main corpus contains 1,310 compiled routes, including the real compat contracts for `GET/POST /maternity/vaccines` and `GET /nutrition/foods`.

The corrected Patient match contains 333 extracted calls: 301 direct method/path matches and 32 manual-review items. Of those 32, several are confirmed method mismatches or wrong client intents rather than absent backend paths. Examples include `POST /articles` where Backend exposes `GET /articles`, `POST /labs/bookings/:id` where the current route is `GET`, `POST /nutrition/foods` where the catalog route is `GET`, and `POST /wallet/balance` where Backend exposes `GET`. Other items such as `/patient/pay-copay`, direct chat thread creation/messages, and `/medical/programs/*` have no compiled path match and require contract-level review before any UI activation.

This is a **Phase 2 finding**, not yet a source fix. The main-default policy remains in force. The affected screens must be marked `FIX` or `BLOCKED` only after DTO, ownership, state transition, and intended user action are verified in Backend and tests.


## Risk-marker classification

Of the 504 broad risk markers found in the main Patient source, 83 occur in test/mock-support files and are not user-facing by themselves. The remaining 421 occur in production paths and require manual classification. The highest-priority production groups include diagnostics booking confirmation (hardcoded/default scheduling and address signals), maternity baby growth and maternity hub, pharmacy custom/manual order and pharmacist chat, consultation chat, health reminders/wearables, insurance add-policy, wallet, AI chat/triage, and location picker. UI component prop names such as `placeholder` are not automatically defects; they must be distinguished from fabricated business values, dead buttons, or missing backend states.


## Scope correction: rebuilds versus actual additions

The current audit must not describe the work as discovering or creating a large set of new screens. The accurate classification is that most visible changes are **rebuilds of existing screens** to remove synthetic data, add real API/state handling, improve UX, or preserve medical-safety behavior.

The separately verifiable additions in the overlapping archive are limited to:

| Application | Actual addition | Correct interpretation |
|---|---|---|
| Patient | Six translation dictionaries and their tests: `medications`, `nutrition`, `maternity`, `mental-health`, `guided-care`, and `health-day` | Additive localization resources, not new screens |
| Patient | `src/utils/medication-notifications.ts` | Local dose-notification utility, not a new screen; requires permission, platform, persistence, cancellation, and test validation |
| Provider | `PlatformMap.tsx`, `PlatformMap.native.tsx`, and `PlatformMap.web.tsx` | Platform abstraction to keep map imports/builds safe, not a new Provider feature screen |
| Admin | No new pages | Internal changes across the existing 34-page Admin surface; verify behavior and data contracts rather than counting pages as additions |

The remaining differences in medication, chronic health, nutrition, maternity/cycle, mental-health, profile, pharmacy reorder, Provider dashboards, radiology, and guided triage are treated as **existing-screen rewrites or rebuilds**. Their acceptance criteria are removal of fabricated values, real backend integration, explicit loading/empty/error/retry states, ownership and consent checks, and preserved feature breadth.

The presence of a verification-only file does not automatically make it the preferred version. `main` remains the default. A file-level exception is permitted only when the alternative demonstrably contains the intended update, preserves or improves real contracts and states, removes synthetic business data, and remains build-compatible. No whole archive is to be replaced silently.


## Current sensitive-file comparison

The file-level matrix now covers 43 sensitive Patient files across profile, medication reminders, reorder/refill, chronic health, nutrition, maternity/cycle, and mental-health. It is stored as `NABDAH_PHASE2_SENSITIVE_PATIENT_DECISION_MATRIX_20260818.tsv`.

The current interpretation is conservative. `main` remains the default for feature-rich screens such as pregnancy tracking, ovulation/cycle tracking, nutrition planning, mental-health activities, and existing profile flows. Verification versions that are short redirects or fail-closed placeholders are not replacements for those features; they are safety references whose loading/error/empty policies may be merged later. The verification versions are candidates for selected data-state improvements where they demonstrably add real API calls and explicit state handling without narrowing the product journey.

The actual additive files confirmed in the overlapping archive are the six translation modules and tests, `src/utils/medication-notifications.ts` and its test, and Provider's three `PlatformMap` platform files. The main archive has the existing localization system under `src/i18n` and direct `react-native-maps` imports in several Provider screens, so these files represent a merge/integration concern rather than proof of new user-facing screens. Admin remains an existing 34-page surface with internal changes; no new Admin page is claimed.

The medication and refill paths already expose real calls such as `GET /health/reminders`, `POST /health/reminders`, `POST /health/reminders/:id/refill`, and `POST /health/reminders/:id/log` in the main feature set. Their remaining review concerns are contract semantics, address/ownership checks, device notification permissions, idempotency, and truthful confirmation states—not inventing a new refill screen.

The phase remains open because the selected file set has not yet been applied to source, dependencies are not installed in the extracted archives, and full typecheck/Jest/export gates are still pending. No alternative archive has been silently merged.


## Actual-addition verification gate

Static source verification confirms that the six translation modules each have a corresponding test file and are imported by the rebuilt Patient screens. The medication notification utility has a dedicated test and is imported by medication reminder list/add, chronic medication, and the notification handler. The tests cover notification action mapping for taken, snooze, open, and ignore cases. Provider has the three platform map files, with native exports delegating to `react-native-maps` and the web implementation intentionally rendering a safe non-native map surface with no-op marker/circle exports and a ref-compatible `animateToRegion` method.

This gate is currently `SOURCE_PRESENT / TEST_PRESENT`, not `TEST_PASS`: the extracted Patient and Provider archives have no installed `node_modules`, so Jest, TypeScript, Expo export, and native/web build execution must occur after dependency installation in a controlled copy. No dependency installation or source mutation was performed in this step.


## Build gate result

An isolated Patient build copy was created from `main`. The first `npm ci` was correctly blocked because `package.json` and `package-lock.json` are not synchronized; npm reported version conflicts including Expo, Jest Expo, Sentry, and Jest types. An isolated `npm install --package-lock-only` repaired the temporary copy only, but the subsequent dependency installation failed with `ENOTFOUND` during package retrieval. The source archive and its lockfile were not changed, and no lockfile repair has been promoted to `main` or the QA branch.

Classification: **BLOCKED / SOURCE-HYGIENE FINDING**, not PASS and not a source fix yet. Before Phase 2 can close, the owner-approved decision is required on whether the lockfile should be regenerated from the declared `package.json` in a network-capable build environment. Any resulting lockfile change must be reviewed, tested, and committed explicitly rather than silently generated in QA.


## Health / medication contract review

The main Backend `HealthModuleController` exposes the Patient medication contracts under the `health` prefix: `GET /health/reminders`, `POST /health/reminders`, `POST /health/reminders/:id/log`, `POST /health/reminders/:id/refill`, `POST /health/reminders/:id/refill/snooze`, `POST /health/reminders/:id/refill/cancel`, `PATCH /health/reminders/:id`, `DELETE /health/reminders/:id`, `GET /health/medications/reminders`, `GET /health/chronic-diseases`, and `GET /health/chronic-meds`. The corresponding main Patient screens use these contracts consistently for loading, logging dose outcomes, editing/deleting reminders, and starting refill workflows.

This contract match is not yet an E2E PASS. The remaining checks are ownership and idempotency for refill mutations, truthful address/order confirmation, persistence of local device notifications versus server dose state, and failure handling when permission or the pharmacy order fails. The main screen comments explicitly avoid treating locally calculated refill days as authoritative and reload server state after mutation; that behavior is retained as a positive safety signal.


## Sensitive workflow findings

The main Profile surface already contains real calls for loyalty balance, profile editing, addresses, insurance companies/networks, and saved insurance data. The address screen uses server-backed loading and an optimistic default-address update with rollback/alert behavior. These are existing-screen rebuilds and should not be described as newly created pages.

The main maternity surface is feature-rich and includes pregnancy setup, pregnancy tracking, ovulation/cycle tracking, baby development/growth, and vaccination-related paths. Its breadth is retained under the main-default policy, but medical defaults, AsyncStorage fallbacks, and optimistic updates require a safety review before activation. The verification branch provides narrower fail-closed state handling; it is a safety reference, not a replacement for the feature journey.

The main nutrition surface includes meal planning, AI plan building, body composition/targets, calorie analysis, daily tracking, exercise planning, food scanning, nutrition plans, and water tracking. The same distinction applies: the broad screens are existing features being rebuilt for truthful data and state behavior, while narrower verification screens may contribute loading/error/empty handling without deleting product breadth.

The main mental-health surface includes hub, breathing, crisis support, meditation, mood journal, self-assessment, and therapist matching. `self-assessment.tsx` calls `/mental-health/assessment-questions` and submits to `/mental-health/assessment`; the workflow must remain fail-closed if questions or clinical responses are unavailable. Crisis actions and therapist navigation require separate safety, consent, and availability verification. Any `Date.now`, demo, placeholder, or fallback marker in these screens remains a review item rather than proof of a defect until its user-facing behavior is confirmed.


A second isolated installation attempt using the local npm cache also failed with `ENOTCACHED` for `redux-persist@6.0.0`. This confirms the remaining build blocker is environmental/dependency availability in the sandbox, in addition to the source lockfile mismatch. No source, lockfile, or branch was changed; the build gate remains `BLOCKED` until a network-capable or fully cached build environment is available.


## Manual review of unmatched Patient calls

The unmatched queue includes both genuine review items and client-intent/method mismatches. Examples requiring a `FIX` review include `POST /patient/pay-copay` where no matching Backend route was found, direct chat thread creation/message paths under `/chat/threads/*` where the current backend contract is not exposed under the same prefix, and `GET /medical/programs/active` while the Backend currently exposes enrollment and complete-session operations rather than an active-program read route. These must not be activated as successful workflows until a real contract is confirmed.

Other entries are method mismatches rather than absent features: `POST /articles` is used where the Backend catalog is read with `GET`; `POST /articles/bookmarks/:slug/status` is used where the status route is `GET` and toggle is `POST`; `PUT /community/posts/:id` has no matching update route in the compiled controller; `POST /labs/bookings/:id` conflicts with the current `GET` detail route; `POST /nutrition/foods` conflicts with the read-only food catalog `GET`; and `POST /wallet/balance` conflicts with the read-only balance route. These are existing-screen contract defects, not missing screens. The decision is to preserve the main feature breadth and correct the client intent or backend contract explicitly in the remediation phase, with ownership and state tests.


A feature-level summary was generated from the file decision queue. It records the current distribution across AI, diagnostics, family, localization, maternity, medicines, mental health, nutrition, reminders, reports, and release/environment files. QA-only additions remain explicitly classified as `QA`; broad feature-rich main screens remain `REVIEW` until contract, safety, and build gates are complete. Release/environment entries are not candidates for source merging and remain environment review items.


A retry with `npm_config_registry=https://registry.npmjs.org` in the isolated build copy still resolved the tarball URL through the environment's configured mirror and failed with `ENOTFOUND npm.mirrors.msh.team` for `redux-persist`. `node_modules` remained absent. This confirms that the Patient runtime gates cannot be honestly reported as passed in this sandbox; the finding is environmental/dependency resolution, not a source modification.
