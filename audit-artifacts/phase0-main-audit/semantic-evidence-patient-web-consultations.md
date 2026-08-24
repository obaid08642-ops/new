# Semantic evidence — Patient Web consultations

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Doctors list

Source: `nabd-patient-web/app/[locale]/consultations/doctors/page.tsx`.

The list validates locale, calls `getPublicDoctors` with search/specialty/sort, extracts server data, renders a truthful unavailable state on failed response and a distinct empty state when no doctors exist. It offers GET search and rating/price/wait sort links, then links each doctor by `doctor.id` to detail. This is a public read surface; it does not itself prove SEO indexability, DTO completeness, or booking availability.

## Doctor detail and slots

Source: `nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx`.

The page validates locale, date format and one of `video|clinic|home`, fetches the doctor and returns not-found on 404/invalid extraction. It fetches slots for the server-derived doctor id/date/service type and displays available/unavailable slot states. A booking form is rendered only when a slots payload contains entries. This establishes a read path for discovery and slots, but the mutation contract is delegated to `AppointmentBookingForm` and remains unverified here.

The detail route uses user-controlled `doctorId` only after backend response and extracted `doctor.id`; this still requires identifier validation, ownership/authorization for booking, slot locking, idempotency, payment/insurance/cash rules and replay tests. Search params are validated for date and enum service type, but semantic date/time-zone and stale-slot behavior require contract evidence.

Both pages have explicit unavailable/empty states, and use Lucide vector icons. No source remediation was made in Phase 0.
