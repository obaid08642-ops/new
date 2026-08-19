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

## Fraud-monitoring extension

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Fraud monitor consumes the same unguarded governance endpoints | The corresponding Backend `AdminGovernanceController` exposes fraud alerts and audit logs without declared authentication/permission guards; the page presents their data as a privileged immutable view. | Protect reads with explicit fraud/audit role policy and viewer audit; add unauthorized-role/tenant-scope tests before release. |
| **P1** | Fraud/audit feed outages are rendered as no alerts/no logs | Non-OK responses and exceptions only reach console; empty arrays show “no fraud indicators” and “No logs found.” | Surface per-feed unavailable/stale/retry state and disallow false-safe compliance conclusions during an outage. |
| **P1** | Fraud screen offers no triage/case/ownership workflow | It shows static cards only, without alert lifecycle, evidence linkage, assignee, decision, escalation, false-positive disposition or retention controls. | Implement an owned fraud case-management state machine with minimum-data evidence, assignment, decision/audit and controlled escalation. |
| **P1** | Immutable/ABAC statements are not supported by visible integrity verification | Payload hashes are displayed as raw strings but no chain verification, source, signature, retention, query scope or tamper state is shown. | Add verifiable integrity/provenance controls or remove the unsupported wording. |

## Decision

The audit-log page is **FIX/BLOCKED** as a governance evidence surface. It must not claim immutable/system-safe audit coverage while authentication, outage truthfulness, evidence provenance and investigative controls are incomplete.
