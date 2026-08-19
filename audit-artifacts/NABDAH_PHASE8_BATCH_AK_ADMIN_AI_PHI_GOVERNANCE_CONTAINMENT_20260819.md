# Phase 8 — Batch AK: admin AI/PHI governance containment

## Purpose

The AI admin page could view model provider/routing and aggregated usage metadata, enable/disable providers and change automatic/manual routing directly from the browser. The route role metadata existed, but Backend management methods did not provide an approved health-data governance policy, immutable change record, operator attribution or independent operational review. These controls are required before an administrator can change a system that may process health-related prompts, images or derived information.

## Source change

| Surface | Implemented control |
|---|---|
| Administrative AI read | Gateway status and usage routes retain admin role metadata but return `503` before revealing routing or usage information. |
| Administrative AI mutation | Provider enablement/configuration and routing-mode changes return `503` before invoking gateway update methods. |
| Browser control | `ai-control` is an explicit unavailable state; it does not load providers/usage or offer model routing/provider mutations. |
| Scope preservation | Patient-facing AI endpoints were not activated, altered or accepted as clinically approved by this change. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend AI containment | **PASS** — 1/1, asserts all admin gateway/usage/mutation entry points fail with `503`. |
| Backend regression suite | **PASS** — 63 suites, 363 tests. |
| Backend production build | **PASS** — `nest build`. |
| Admin source contracts | **PASS** — 4/4, including explicit AI control unavailability. |
| Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `c5af51d8595d6a52077f764e109af022ffb2fe6346a082ef82556f0f24c77099`. |
| Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `bf0213c755c4808a840029ff8002cab522896bef505a960484e67ebacb3f9f91`. |
| Branch upload | **PASS** — archive commit `f71110b` (`fix: contain ungoverned admin AI controls`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No AI provider, model setting, API key, usage entry, patient content, prompt, image, clinical record, sandbox account or production record was read, created or modified. This containment does not certify any AI endpoint, clinical recommendation, image interpretation or provider. Before any administrative AI surface reopens, the owner must approve data classification/minimization, consent, retention/deletion, provider agreement, model/routing change controls, immutable operator audit, safety evaluation, incident handling and clinical-human-review policy. Phase 11 must use reviewer-authorized sandbox data only.
