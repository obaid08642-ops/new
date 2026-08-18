# Phase 4 Admin Dashboard — AI gateway governance gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Admin can enable/disable or pin external AI providers without visible PHI/clinical governance | UI controls Gemini, Groq, OpenAI, DeepSeek, OpenRouter, Cerebras, Qwen and image provider routing with a single click; no processor classification, patient-consent basis, data residency, feature allowlist, DPA/security review or clinical risk control is shown. | Establish approved provider/feature data-processing policy, PHI/medical-image exclusion/allowlist, region/residency controls, consent/legal basis, versioned model approval and auditable change management before routing patient data. |
| **P0** | Gateway mutations suppress errors and have no high-risk approval/rollback evidence | Enable/disable/pin calls catch failures to null, then reload; no error, prior-state, actor/reason, maintenance window, maker-checker, emergency rollback or operation reference is displayed. | Require typed server response/status, step-up/maker-checker for high-impact routing, reason/audit/version, safe rollback and explicit failure/retry state. |
| **P1** | Gateway-load failure becomes perpetual “loading” and usage failure becomes no usage | If gateway request fails, `data` remains null and page never exits loading; usage catches to empty and states no use. | Render independent unavailable/stale/retry states with last verified version/timestamp; never report unused/healthy control plane on source outage. |
| **P1** | Usage table omits safety/privacy/cost/accountability evidence | It shows aggregated calls/failures/latency but no data category, patient/feature policy, prompt/image retention, incident, cost/budget, consent/opt-out or model version/change correlation. | Provide minimum-necessary, non-PHI governance metrics with provider/model/version/feature/policy, cost budget, retention and security event correlation. |
| **P1** | AI control UI is Arabic-only and lacks accessible high-risk warning content | Provider status, routing effects and usage actions do not meet six-language/RTL-LTR accessibility or clinical safety-copy requirements. | Deliver approved multilingual, accessible high-risk control UI only after governance rules exist. |

## Decision

AI gateway administration is **P0 FIX/BLOCKED**. Model routing must not be used as an ungoverned feature toggle for medical/health data until the approved privacy, clinical safety, provider, consent and auditable-change contracts are implemented.
