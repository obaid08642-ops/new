# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_AI_GATEWAY_GAPS_20260819.md`
- **Member SHA-256:** `a4ae7fbb8687311f2bcdb7a3361983bd409f00725b80a101e90d6eff95d00006`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | **P0** | Admin can enable/disable or pin external AI providers without visible PHI/clinical governance | UI controls Gemini, Groq, OpenAI, DeepSeek, OpenRouter, Cerebras, Qwen and image provider routing with a single click; no processor c`
- `8: | **P0** | Gateway mutations suppress errors and have no high-risk approval/rollback evidence | Enable/disable/pin calls catch failures to null, then reload; no error, prior-state, actor/reason, maintenance window, maker-checker, emergency `
- `9: | **P1** | Gateway-load failure becomes perpetual “loading” and usage failure becomes no usage | If gateway request fails, `data` remains null and page never exits loading; usage catches to empty and states no use. | Render independent unav`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — AI gateway governance gaps`
- `7: | **P0** | Admin can enable/disable or pin external AI providers without visible PHI/clinical governance | UI controls Gemini, Groq, OpenAI, DeepSeek, OpenRouter, Cerebras, Qwen and image provider routing with a single click; no processor c`
- `15: AI gateway administration is **P0 FIX/BLOCKED**. Model routing must not be used as an ungoverned feature toggle for medical/health data until the approved privacy, clinical safety, provider, consent and auditable-change contracts are implem`
### state_transitions
- `3: ## Confirmed defects`
- `7: | **P0** | Admin can enable/disable or pin external AI providers without visible PHI/clinical governance | UI controls Gemini, Groq, OpenAI, DeepSeek, OpenRouter, Cerebras, Qwen and image provider routing with a single click; no processor c`
- `8: | **P0** | Gateway mutations suppress errors and have no high-risk approval/rollback evidence | Enable/disable/pin calls catch failures to null, then reload; no error, prior-state, actor/reason, maintenance window, maker-checker, emergency `
- `9: | **P1** | Gateway-load failure becomes perpetual “loading” and usage failure becomes no usage | If gateway request fails, `data` remains null and page never exits loading; usage catches to empty and states no use. | Render independent unav`
- `11: | **P1** | AI control UI is Arabic-only and lacks accessible high-risk warning content | Provider status, routing effects and usage actions do not meet six-language/RTL-LTR accessibility or clinical safety-copy requirements. | Deliver appro`
- `15: AI gateway administration is **P0 FIX/BLOCKED**. Model routing must not be used as an ungoverned feature toggle for medical/health data until the approved privacy, clinical safety, provider, consent and auditable-change contracts are implem`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: | **P0** | Gateway mutations suppress errors and have no high-risk approval/rollback evidence | Enable/disable/pin calls catch failures to null, then reload; no error, prior-state, actor/reason, maintenance window, maker-checker, emergency `
- `9: | **P1** | Gateway-load failure becomes perpetual “loading” and usage failure becomes no usage | If gateway request fails, `data` remains null and page never exits loading; usage catches to empty and states no use. | Render independent unav`
- `10: | **P1** | Usage table omits safety/privacy/cost/accountability evidence | It shows aggregated calls/failures/latency but no data category, patient/feature policy, prompt/image retention, incident, cost/budget, consent/opt-out or model vers`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
