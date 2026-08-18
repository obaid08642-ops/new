# Phase 4 Admin Dashboard — audit-log governance gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Audit-log page bypasses the common guarded client and reads `admin_token` from local storage | It manually sets `Authorization: Bearer ${localStorage.admin_token}`, repeating the privileged browser-token exposure and diverging from secure cookie/session handling. | Use the unified verified HTTP-only admin session client; remove direct browser-token reads and add explicit authorization/permission handling for audit access. |
| **P1** | Fetch failure is indistinguishable from no audit events | Failed/non-OK request only logs to console; `logs` remains empty and UI states “no abnormal operations.” | Add explicit error/stale/retry state and neutral “no records in selected scope” copy; never represent unavailable audit evidence as system safety. |
| **P1** | UI claims immutable ABAC audit tracking without presenting integrity/provenance evidence | Page lists basic fields only and has no log-chain/export hash, source/version, retention, access/view audit, verification status or tamper alert. | Link claims to an approved immutable/auditable backend design, expose verification metadata and controlled export, and remove unsupported immutability claims until demonstrated. |
| **P1** | Audit review lacks time range, actor/action/target filters, pagination and safe detail view | It loads the whole returned list with no scoped investigation workflow or searchable correlation field. | Implement server-side filtered/paginated audit query, stable event ID/correlation/request/device/IP metadata, masked detail viewer and scoped export policy. |
| **P1** | Missing fields are fabricated as a current time and “Super Admin” | Fallbacks use `Date.now()` and literal privileged actor name, which creates false evidence. | Render explicit unknown/malformed data states, log data-quality issue, and never synthesize audit facts. |
| **P1** | Audit UI is Arabic-only and severity value is raw English | No six-language / RTL-LTR accessible labels or structured severity/status localization exist. | Provide reviewed six-language accessible audit terminology and locale-safe timestamp formatting. |

## Decision

The audit-log page is **FIX/BLOCKED** as a governance evidence surface. It must not claim immutable/system-safe audit coverage while authentication, outage truthfulness, evidence provenance and investigative controls are incomplete.
