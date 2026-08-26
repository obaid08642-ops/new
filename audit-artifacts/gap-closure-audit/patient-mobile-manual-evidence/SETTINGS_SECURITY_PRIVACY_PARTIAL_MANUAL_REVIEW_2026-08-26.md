# Patient Mobile: Settings security and privacy — partial manual review

## Scope boundary

This evidence-first partial wave covers only `app/settings/security.tsx` and `app/settings/privacy.tsx`. It does not close the remaining Settings, Notifications or Support routes. No product source, build, runtime test, deployment, merge or live-data action was performed.

| Reviewed source | Scope |
|---|---|
| `app/settings/security.tsx` | Security preferences, password change, active-session list/revocation |
| `app/settings/privacy.tsx` | Privacy preference toggles and data-deletion request |

## Evidence-backed findings

| ID | Classification | Evidence | Finding | Required closure evidence |
|---|---|---|---|---|
| PM-SET-001 | `CONFIRMED_DEFECT` | `settings/security.tsx:39–59, 138–187` | Biometric and 2FA controls optimistically persist bare booleans and swallow request errors. There is no device capability/biometric enrollment/secure key binding, 2FA method enrollment, OTP challenge, recovery-code, or step-up verification flow. UI wording promises Face ID/fingerprint and SMS on every login without evidence. | Device and server auth enrollment contracts, capability/denial UX, 2FA challenge/recovery state machine, failure rollback and endpoint authorization/runtime evidence. |
| PM-SET-002 | `STATIC_MATCHED_PARTIAL` | `settings/security.tsx:61–82, 84–116, 190–327` | Password rotation and session list/revoke CTAs make concrete requests, but source alone cannot prove current-password verification, password policy/history, token/session invalidation, current-session handling, device metadata integrity, or owner enforcement. | Backend controller/service/session schema, password security policy, revocation propagation and owner/stranger/expired-session tests. |
| PM-SET-003 | `CONFIRMED_DEFECT` | `settings/privacy.tsx:30–53, 55–81, 102–115` | Privacy toggles are optimistic fire-and-forget patches with swallowed errors. The screen simultaneously claims ISO 27001 protection/no third-party sales and exposes a third-party-sharing toggle described as insurance/pharmacy partners. No versions, purposes, legal bases, consent timestamps, vendor registry or withdrawal effects are presented. | Consent/purpose/version/audit model; error rollback; data-sharing recipient/purpose inventory; legal/privacy review and backend enforcement evidence. |
| PM-SET-004 | `INSUFFICIENT_EVIDENCE` | `settings/privacy.tsx:151–183` | “Delete all personal data” submits a generic support request then promises 72-hour follow-up. The source contains no identity verification, request ID/status, cancellation, data-scope/retention/legal-hold explanation, deletion execution or completion evidence. | Subject-rights workflow/state model, verification, request tracking, data inventory/retention/exceptions, audit and completion notification. |

## Conclusion

The two reviewed Settings surfaces do not establish their advertised security/privacy capabilities. The biometric/2FA and consent controls are preference toggles pending contract and runtime validation; the data-deletion CTA is only a support request. Only these two Settings routes should be marked manually reviewed at this point.
