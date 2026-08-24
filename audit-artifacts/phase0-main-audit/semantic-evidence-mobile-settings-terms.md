# Semantic evidence — Mobile Settings Terms

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/terms.tsx:17–58` embeds the entire terms document as hard-coded Arabic strings and renders it without fetching a legal source of truth. The page shows a fixed “آخر تحديث: 1 يونيو 2026” (`:87–100`) but no document version, effective date semantics, publication signature, locale variants, consent/acceptance checkbox, re-consent workflow, or acknowledgement audit trail. Changes in server policy can therefore diverge from the app.

The text contains material legal, security, medical, licensing, and financial claims: Saudi PDPL compliance, AES-256/ISO 27001, no third-party sharing, deletion rights, all doctors being licensed, emergency number 997, cancellation/refund windows, wallet refund timing, pharmacy return rules, and fixed legal/support contacts (`:24–56`). None is verified or linked to backend/provider policy in this screen. The cancellation/return statements may contradict actual service/order state machines and must be reconciled before production.

There is no acceptance gating for age, medical disclaimer, privacy consent, marketing communications, payment terms or policy updates. No web canonical/legal index parity, offline policy versioning, accessibility labeling or locale coverage is established. No Phase 0 remediation was made.
