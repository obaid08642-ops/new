# Semantic evidence — Mobile Services Hub

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/services/index.tsx:18–67` defines a static directory of services and routes, including consultations, diagnostics, nursing, SOS, pharmacy, health, reminders, reports, AI tools, nutrition, maternity, mental health, community, family, orders, insurance, wallet, loyalty, offers and map. The file performs no API call, capability/availability check, feature flag evaluation, locale-aware catalog load or server-owned service metadata.

Every item navigates directly with `router.push(item.route)` (`:69–106`). Several routes are generic or parameterless despite requiring context: reports points to `/reports/view-report` without a report ID; diagnostics is shared for labs/radiology; and AI/community/nutrition/maternity/mental-health/wallet/offers/map are advertised without evidence in this screen of implementation, contract, licensing/availability, or truthful blocked states. A missing route or unavailable service therefore manifests as a navigation failure rather than an explicit unavailable/coming-soon/error state.

The descriptions make product claims such as emergency ambulance, rapid delivery, pregnancy follow-up, symptom triage, prescription translation, and monthly reports (`:22–64`) without source freshness, eligibility, consent or clinical safety disclosure. The hub has no auth/guest policy, deep-link parameter validation, loading/error/empty state, analytics/audit behavior, or service-specific handoff semantics. No Phase 0 remediation was made.
