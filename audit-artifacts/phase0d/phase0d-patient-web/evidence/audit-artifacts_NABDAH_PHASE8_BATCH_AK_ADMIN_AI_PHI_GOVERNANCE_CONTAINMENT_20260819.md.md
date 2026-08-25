# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AK_ADMIN_AI_PHI_GOVERNANCE_CONTAINMENT_20260819.md`
- **Member SHA-256:** `3b550d5a40d823afa9ce23c24665f248aacf8098f10929f1080ee5ff4b01a89c`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The AI admin page could view model provider/routing and aggregated usage metadata, enable/disable providers and change automatic/manual routing directly from the browser. The route role metadata existed, but Backend management methods did n`
- `11: | Administrative AI read | Gateway status and usage routes retain admin role metadata but return `503` before revealing routing or usage information. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `27: | Branch upload | **PASS** — archive commit `f71110b` (`fix: contain ungoverned admin AI controls`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AK: admin AI/PHI governance containment`
- `5: The AI admin page could view model provider/routing and aggregated usage metadata, enable/disable providers and change automatic/manual routing directly from the browser. The route role metadata existed, but Backend management methods did n`
- `11: | Administrative AI read | Gateway status and usage routes retain admin role metadata but return `503` before revealing routing or usage information. |`
- `12: | Administrative AI mutation | Provider enablement/configuration and routing-mode changes return `503` before invoking gateway update methods. |`
- `20: | Focused Backend AI containment | **PASS** — 1/1, asserts all admin gateway/usage/mutation entry points fail with `503`. |`
- `23: | Admin source contracts | **PASS** — 4/4, including explicit AI control unavailability. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `26: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `bf0213c755c4808a840029ff8002cab522896bef505a960484e67ebacb3f9f91`. |`
- `27: | Branch upload | **PASS** — archive commit `f71110b` (`fix: contain ungoverned admin AI controls`) is pushed to `manus/on-live-reconciliation`. |`
- `31: No AI provider, model setting, API key, usage entry, patient content, prompt, image, clinical record, sandbox account or production record was read, created or modified. This containment does not certify any AI endpoint, clinical recommenda`
### state_transitions
- `5: The AI admin page could view model provider/routing and aggregated usage metadata, enable/disable providers and change automatic/manual routing directly from the browser. The route role metadata existed, but Backend management methods did n`
- `11: | Administrative AI read | Gateway status and usage routes retain admin role metadata but return `503` before revealing routing or usage information. |`
- `13: | Browser control | `ai-control` is an explicit unavailable state; it does not load providers/usage or offer model routing/provider mutations. |`
- `14: | Scope preservation | Patient-facing AI endpoints were not activated, altered or accepted as clinically approved by this change. |`
### payment_insurance_relevance
- `13: | Browser control | `ai-control` is an explicit unavailable state; it does not load providers/usage or offer model routing/provider mutations. |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
