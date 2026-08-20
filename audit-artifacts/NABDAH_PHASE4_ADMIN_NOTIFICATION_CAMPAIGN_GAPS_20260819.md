# Phase 4 Admin Dashboard — notification and campaign governance gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Mass broadcast can target all patients/providers with only one form submit | Composer permits `all` or broad role segment plus direct send, with no recipient preview/count confirmation, consent/preference exclusion, content approval, maker-checker, quiet-hour/timezone, rate-limit or campaign audit receipt in UI. | Require server-calculated audience preview and consent/policy filtering, approved template/content classification, role-based approval for high-reach campaigns, idempotent campaign ID and immutable delivery/audience audit. |
| **P0** | Manual retargeting reports success even when API fails | `runRetarget` catches any error to `null` then unconditionally alerts that retargeting ran. | Show failure/retry and returned execution reference/state; restrict retargeting to approved consented cohorts with audit and throttling. |
| **P1** | Deep links are arbitrary free text | Admin may enter any route string; UI does not validate an allowlist, recipient-compatible destination, signed context or test preview. | Use typed/allowlisted deep-link destinations with safe parameters, role/app compatibility validation, preview/test-device workflow and click audit. |
| **P1** | Campaign scheduling has no explicit timezone/past-date/recipient-state validation | Local `datetime-local` is transformed by browser timezone; no UI policy or returned normalized schedule/effective audience is displayed. | Require server-side timezone/past-time/quiet-hour validation and show normalized schedule/version/recipient count before approval. |
| **P1** | Data-source failures become zero/unknown performance and empty campaign queues | Stats/segments/campaign failures are individually caught to `null`/empty data without an error state. | Show per-source unavailable/stale/retry states and never infer zero delivery/open/click/audience from an outage. |
| **P1** | Campaign UI is Arabic-only and lacks accessibility/notification-privacy warnings | Content, segment, delivery, cancellation and recipient data lack reviewed six-language/RTL-LTR accessibility and privacy context. | Deliver reviewed locale UI and minimum-data/consent warnings before release. |

## Decision

Admin notification/campaign control is **P0 FIX/BLOCKED**. It must not dispatch or retarget users until audience consent, content approval, safe routing, scheduling validation, truthful execution state and audit controls are implemented.
