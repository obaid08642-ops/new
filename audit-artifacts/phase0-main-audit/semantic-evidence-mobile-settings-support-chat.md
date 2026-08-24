# Semantic evidence — Mobile Settings Support Chat

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/support-chat.tsx:1–5` contains only an Expo Router redirect from the settings route to `/support/chat`. It has no support-ticket/chat implementation, context propagation, authentication/guest policy, membership/participant binding, PHI minimization, consent, attachment handling, realtime/send contract, idempotency, moderation, retry/error states, or explicit blocked/unavailable explanation.

This wrapper itself does not prove that `/support/chat` is implemented or that it can receive a preauthorization context from Insurance Coverage Check. It also does not preserve a service, policy, claim or request ID when used as a generic destination. No Phase 0 remediation was made.
