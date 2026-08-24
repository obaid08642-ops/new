# Semantic evidence — Mobile Family Hub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:1–26` is marked `@ts-nocheck` and uses `apiFetch` plus `useGuestGuard`. The quick-action grid exposes invite, join-by-code, shared calendar, family chat and emergency contacts routes (`:28–60`). These destinations require independent route, consent and authorization verification.

Authenticated users load `/family/my-group` and `/family/members` (`:62–94`). A missing group is treated as the normal no-group state only when the error message contains the literal phrase `no family group found`; other errors are logged/ignored and the page may fall through to an empty/no-group presentation. The page has no visible retry or unavailable state.

Create-group calls `POST /family/create` with a hard-coded name `{ name: "عائلتي" }` and then reloads (`:96–109`). No visible idempotency key, duplicate/replay handling, typed DTO, server-generated name policy or error state is shown. Guests are redirected through `requireAuth('family')` and the component returns null (`:111–115`), which requires verification that the guard performs navigation safely and does not create a render loop.

Member cards use `m.user_id` to navigate to `/family/member-health` and `/family/permissions`, while chat navigation uses `/family/chat` without a member identifier (`:221–277`). Names use fallbacks (`display_name || ...`) and joined status is inferred from `joined_at` (`:223–255`). The UI therefore exposes family member health/permission actions without proving consent scope, owner/member role enforcement, relationship changes, revocation, audit or PHI minimization.

The copy claims that family groups enable sharing medical reports/vitals and booking appointments for relatives (`:177–183`). This is a product/consent claim that requires backend state-machine and legal-policy evidence. No Phase 0 remediation was made.
