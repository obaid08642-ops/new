# Semantic evidence — Mobile Prescriptions

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/health/prescriptions.tsx:1–12` is marked `@ts-nocheck` and uses `apiFetch`, `Share`, and `useGuestGuard` (the hook is imported but not used in the shown source). The screen loads `/health/prescriptions`, accepts either an array or `.data`, logs errors to console and then renders an empty list with no explicit error/retry state (`:16–35,58–63`).

It computes prescription count, medication count and pending count locally from `prescriptions.length`, medication array lengths and `isPurchased` (`:47–55`). These counters require server-state semantics and treatment of malformed/incomplete records; the response shape is `any`-backed.

Unpurchased prescriptions expose an `اطلب` CTA that routes to the pharmacy tab rather than passing a prescription identifier or proving prescription-specific order linkage (`:63–73`). The share action serializes doctor/date/medication names and doses into the device share sheet (`:74–84`), requiring PHI disclosure policy and explicit user confirmation/audit expectations. OCR prescriptions display `ocrAccuracy` as an AI accuracy claim without confidence calibration, provenance or correction flow (`:86–93`).

The source has no download/view-original prescription action, no medication-level detail, no server-side reorder/checkout contract, and no explicit ownership/unauthorized behavior. It renders `item.icon` through an icon component without validating the icon name (`:95–97`).

No Phase 0 remediation was made.
