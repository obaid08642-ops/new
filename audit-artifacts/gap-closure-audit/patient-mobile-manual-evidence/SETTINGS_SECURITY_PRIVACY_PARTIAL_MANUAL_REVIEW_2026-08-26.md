# Patient Mobile: Settings security and privacy — partial manual review

## Scope boundary

This evidence-first review covers all 12 Settings routes, the Notifications inbox and both Support routes listed below. It does not prove backend authorization, legal/compliance truth, push delivery, support staffing, retention, deletion, or runtime behavior. No product source, build, runtime test, deployment, merge or live-data action was performed.

| Reviewed source | Scope |
|---|---|
| `app/settings/security.tsx` | Security preferences, password change, active-session list/revocation |
| `app/settings/privacy.tsx` | Privacy preference toggles and data-deletion request |
| `app/settings/data.tsx` | Personal-data storage and subject-rights actions |
| `app/settings/notifications-settings.tsx` | Notification preference controls |
| `app/settings/index.tsx` | Settings navigation, calendar/language/logout handoff |
| `app/settings/language.tsx` | Language selection |
| `app/settings/notifications.tsx` | Redirect to notification preferences |
| `app/settings/about.tsx` | Product/about claims and external links |
| `app/settings/help.tsx` | FAQ and support-entry hub |
| `app/settings/support-chat.tsx` | Redirect to support chat |
| `app/settings/feedback.tsx` | Feedback submission |
| `app/settings/terms.tsx` | Embedded terms content |
| `app/notifications/index.tsx` | Notification inbox/read/navigation actions |
| `app/support/chat.tsx` | Support conversation and attachment flow |
| `app/support/ticket.tsx` | Ticket list and ticket-to-chat handoff |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-SET-001 | `CONFIRMED_DEFECT` | `settings/security.tsx:39–59, 138–187` | Biometric and 2FA controls optimistically persist bare booleans and swallow request errors. There is no device capability/biometric enrollment/secure key binding, 2FA method enrollment, OTP challenge, recovery-code, or step-up verification flow. UI wording promises Face ID/fingerprint and SMS on every login without evidence. | Device and server auth enrollment contracts, capability/denial UX, 2FA challenge/recovery state machine, failure rollback and endpoint authorization/runtime evidence. |
| PM-SET-002 | `STATIC_MATCHED_PARTIAL` | `settings/security.tsx:61–82, 84–116, 190–327` | Password rotation and session list/revoke CTAs make concrete requests, but source alone cannot prove current-password verification, password policy/history, token/session invalidation, current-session handling, device metadata integrity, or owner enforcement. | Backend controller/service/session schema, password security policy, revocation propagation and owner/stranger/expired-session tests. |
| PM-SET-003 | `CONFIRMED_DEFECT` | `settings/privacy.tsx:30–53, 55–81, 102–115` | Privacy toggles are optimistic fire-and-forget patches with swallowed errors. The screen simultaneously claims ISO 27001 protection/no third-party sales and exposes a third-party-sharing toggle described as insurance/pharmacy partners. No versions, purposes, legal bases, consent timestamps, vendor registry or withdrawal effects are presented. | Consent/purpose/version/audit model; error rollback; data-sharing recipient/purpose inventory; legal/privacy review and backend enforcement evidence. |
| PM-SET-004 | `INSUFFICIENT_EVIDENCE` | `settings/privacy.tsx:151–183` | “Delete all personal data” submits a generic support request then promises 72-hour follow-up. The source contains no identity verification, request ID/status, cancellation, data-scope/retention/legal-hold explanation, deletion execution or completion evidence. | Subject-rights workflow/state model, verification, request tracking, data inventory/retention/exceptions, audit and completion notification. |
| PM-SET-005 | `MISSING_CAPABILITY` | `settings/data.tsx:24–63, 84–151` | Data-management declares download, portability and deletion rights, including JSON/PDF within 24 hours and FHIR R4/HL7 compatibility, but all three action handlers are empty. The fixed 2 GB quota is not sourced from the response. | Implemented subject-access/export/portability/deletion flows with request/identity/status/error handling; export standard/schema evidence; authoritative storage quota and retention model. |
| PM-SET-006 | `CONFIRMED_DEFECT` | `settings/notifications-settings.tsx:21–114, 181–280` | Notification settings optimistically persist booleans and swallow failures; the UI declares emergency notifications cannot be disabled and asserts appointment/medicine timing, but invokes no OS permission/channel API or push-token registration/reconciliation. | OS permission/channel and push-token lifecycle, server preference enforcement, emergency-notification policy, failure rollback and delivery/runtime evidence. |
| PM-SET-007 | `CONFIRMED_DEFECT` | `settings/feedback.tsx:29–43, 47–74` | Feedback sets `sent=true` and shows the same acknowledgement/24-hour response promise after API failure. This is a source-confirmed false-success flow. | Preserve draft/retry/error state; server ticket/reference and support-SLA evidence; no success until accepted response. |
| PM-SET-008 | `MISSING_CAPABILITY` | `settings/terms.tsx:17–58, 87–100`; `settings/about.tsx:18–52, 112–125` | Terms, version date, licenses, encryption/ISO claims, cancellation/refund policy, support SLA, team/product claims and social URLs are embedded static content. There is no legal-source/version/locale retrieval, acceptance record, effective-date/consent reconciliation, or evidence that claims match operations. | Authoritative legal CMS/version/acceptance contract; legal/clinical/license verification; policy-to-product reconciliation and local fallback governance. |
| PM-SET-009 | `CONFIRMED_DEFECT` | `support/chat.tsx:49–65, 67–116, 247–277` | Support chat seeds a local bot greeting if history is empty, appends user messages before acceptance, inserts a local apology reply on errors, promises immediate availability, and uploads media then embeds the returned URL as plain message text. This mixes support truth with fabricated content and leaves attachment access/retention/PHI handling unproven. | Ticket/conversation/message state model; honest unavailable/pending/error UX; authenticated scoped attachment metadata/ACL/retention/malware scan; agent/SLA evidence. |
| PM-SET-010 | `STATIC_MATCHED_PARTIAL` | `notifications/index.tsx:62–75, 86–122, 128–208` | Inbox reads notifications and handles retry, but maps type/group and relative time locally, marks a single notification read optimistically while swallowing failure, and translates server routes through a client vocabulary map. Static source cannot prove notification ownership, delivery, payload integrity or navigation authorization. | Notification event/action contract, owner authorization, delivery/expiry/read model, route-ID validation and runtime tests. |
| PM-SET-011 | `MISSING_CAPABILITY` | `support/ticket.tsx:25–30, 43–48, 61–99`; `settings/help.tsx:39–49, 68–105, 158–176` | Tickets are only listed; both existing-ticket taps and “new” route to generic chat without ticket ID or compose/detail state. Help advertises 24/7 support and routes contacts, but no support availability/SLA or ticket linkage is established. | Ticket create/detail/update/attachment/status contract; ticket-to-chat identity binding; escalation/availability/SLA evidence. |
| PM-SET-012 | `INSUFFICIENT_EVIDENCE` | `settings/index.tsx:72–93`; `settings/language.tsx:24–47`; `settings/notifications.tsx:1–8`; `settings/support-chat.tsx:1–5` | Settings index delegates logout to Redux and redirects, language selection to context, and two routes only redirect. Source alone cannot prove token/session revocation, localization persistence/RTL reload/accessibility, or route-level authentication boundary. | Auth-store/session evidence, local-storage/token lifecycle and logout tests; language/RTL persistence tests; canonical route/guard policy. |

## Conclusion

The reviewed Settings, Notifications and Support surfaces do not establish their advertised security/privacy, legal, delivery or support capabilities. The biometric/2FA and consent controls are preference toggles pending contract and runtime validation; the data-deletion CTA is only a support request; feedback has a false-success branch; and support chat fabricates fallback content. Only the listed sources should be marked manually reviewed at this point.
