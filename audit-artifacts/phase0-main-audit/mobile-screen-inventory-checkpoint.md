# Mobile screen inventory checkpoint

Baseline: `main @ 22526bedb77a3d8148219036367e4714f401aecc`.

A repository inventory was run over `audit-work/source/nabd_plus_patient_app/app` for `.tsx` and `.ts` route files. The complete raw list is temporarily at `/tmp/mobile_app_files.txt`; the shell output was intentionally truncated by the environment, so this checkpoint records the evidence-index state rather than claiming every route is semantically closed.

The current evidence index contains dedicated semantic evidence for auth/navigation, consultation booking, diagnostics hub, labs, pharmacy catalog/cart/checkout/payment/order confirmation/order history/reorder/tracking/orders center, nursing catalog/details, health/vitals, prescriptions, medical profile, addresses, language/settings/notifications/privacy/security/data, family hub/member health/permissions/invite/join/scan/chat, insurance base/add-policy/coverage-check, and the audited Web/Provider/Admin surfaces.

Remaining route files must continue to be checked against this evidence index, especially reports (`hub`, `ai-analysis`, `passport`, `timeline`, `view-report`), programs, returns (`hub`, `detail`, `new-request`), reviews, room/video, generic service/search routes, and settings support/help/about/feedback where no dedicated semantic evidence is currently indexed. Presence in the filesystem is not treated as semantic verification. No Phase 0 remediation was made.
