# Semantic evidence — Patient Web health and prescriptions

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Health dashboard

Source: `app/[locale]/health/page.tsx`.

The page requires patient access and reads a server-backed vital summary through `getPatientVitalSummary`, handling auth redirect, forbidden/not-found and unavailable/retry states. It renders a translated quick-action grid to prescriptions, family, reminders, chat, sleep, chronic diseases/medications, trends and vitals history, plus parsed vital values with units and measured timestamps. The quick actions provide navigation coverage but do not prove that each destination is implemented or that its mutation path is wired.

The source includes six locale label dictionaries for these quick actions. PHI exposure, minimum fields, ownership and caching require review of the server helper and response headers. No health mutation is in this page.

## Prescriptions

Source: `app/[locale]/prescriptions/page.tsx`.

The page requires patient access, reads `getPatientPrescriptions`, handles auth/not-found/unavailable/retry, parses summaries and renders state, doctor, item count, medication names and creation date from server data. It has a truthful empty state and no prescription detail link, upload, reorder/renew, pharmacy selection or purchase CTA in the source.

The absence of a detail/action link means this page is read-only in the baseline. It does not establish the patient prescription journey required for pharmacy purchase, especially prescription validation, media upload, pharmacist review, quote, insurance/cash choice, payment and order creation. No Phase 0 remediation was made.
