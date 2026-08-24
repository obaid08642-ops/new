# Semantic evidence — Mobile Nursing / Home-care

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/(tabs)/nursing.tsx:28–216` fetches `/home-care/services` and `/home-care/packages`, displays package/service cards, search input, gender/availability/nationality filters, cash versus insurance toggle, and quick-book/detail navigation. The service and package requests catch errors with `console.error` and do not expose an unavailable state (`:44–53`).

`applyFiltersAndSearch` only closes the modal (`:80–82`); it does not apply the selected gender, availability, nationality or search values to the displayed `dbServices` list in the confirmed source. The UI therefore presents filter controls that are behaviorally incomplete. Service cards include server price when present, but also use local icon/color mappings and package fallback descriptions (`:55–77`, `:148–180`, `:182–216`).

Navigation sends service id, title, payment flow and filter values to `/nursing/service-details` or `/nursing/service-info` (`:90–103`, `:156`, `:192`, `:207–213`). The source alone does not establish provider ownership, address/slot quote, insurance verification, booking idempotency, provider matching, cancellation/reschedule, visit tracking, SOS, refund, or completion/report behavior.

## Cross-layer verification required

1. Map `/home-care/services`, `/home-care/packages`, details, provider selection, booking and tracking routes to `home-care-compat` and canonical backend modules.
2. Prove filter semantics and provider availability from server data.
3. Verify cash/insurance branches and insurance upload/coverage/authorization states.
4. Verify address/coordinates are real and not fallback/fabricated.
5. Trace provider assignment, visit check-in, care plan, SOS, cancellation, refund and completion events.
6. Compare Web home-care surfaces and Provider Nursing operations for the same state machine.

No Phase 0 remediation was made.
