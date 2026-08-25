# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PROVIDER_AGREEMENT_FAIL_CLOSED_20260819.md`
- **Member SHA-256:** `06b5e40cba8928e0afd1b99618c3121d90d88563a379393a0ae1280a5d001efd`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: The provider agreement modal previously contained a long local legal-agreement fallback. If policy loading failed, the app displayed that unverified text. The acceptance button remained available and attempted to accept the agreement with a`
- `41: This source remediation does not approve any legal content. The owner/legal/product team must still approve the actual policy content, language availability, acceptance record, retention, retrieval, and audit requirements. No agreement was `
### state_transitions
- `7: ## Confirmed Defect`
- `9: The provider agreement modal previously contained a long local legal-agreement fallback. If policy loading failed, the app displayed that unverified text. The acceptance button remained available and attempted to accept the agreement with a`
- `15: | Policy display | Clears stale state when reopened and displays only a policy with both server-provided `content` and `version`. No hard-coded agreement is retained. |`
- `17: | Acceptance gate | The agreement button is disabled while accepting or while no approved policy is available. |`
- `19: | Error handling | Acceptance errors produce an error message and preserve the modal; only a successful server response closes it. |`
- `21: | Regression | New contract test rejects the local agreement, empty silent catch, and acceptance without policy/version. |`
### payment_insurance_relevance
- `20: | Locale coverage | The three new fail-closed messages were added to the six-locale resolver, increasing its verified text-pair count from 2,810 to 2,813. |`
### error_empty_loading_retry_cancel
- `9: The provider agreement modal previously contained a long local legal-agreement fallback. If policy loading failed, the app displayed that unverified text. The acceptance button remained available and attempted to accept the agreement with a`
- `19: | Error handling | Acceptance errors produce an error message and preserve the modal; only a successful server response closes it. |`
- `21: | Regression | New contract test rejects the local agreement, empty silent catch, and acceptance without policy/version. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
