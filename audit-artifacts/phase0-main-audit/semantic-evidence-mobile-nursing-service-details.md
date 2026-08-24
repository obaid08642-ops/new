# Semantic evidence — Mobile Nursing Service Details

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/nursing/service-details.tsx:19–52` loads providers from `/home-care/providers` using query parameters assembled from route params (`serviceId`, sort, gender, availability, nationality, search). The source catches failures by logging only and leaves `nurses` as an empty list (`:32–41`), with no visible error/retry state distinct from a genuine no-provider result.

The hero copy claims licensed nursing staff, direct Ministry of Health supervision, immediate response and comprehensive coverage (`:69–80`). These are hard-coded claims and require legal/provider verification. Provider cards render `name_ar`, `facility_name`, rating, distance and `available_now` without field validation or explicit freshness/source semantics (`:94–130`). Missing price displays “يُحدد عند الحجز” (`:134–139`), and the select path routes to nurse profile using the local nurse ID without slot, quote, address, availability reservation or payment context (`:141–153`).

For injection/IV services, the screen opens a local modal asserting that an approved prescription is required and, after the user taps “أوافق وأمتلك وصفة”, routes to profile; no prescription upload, verification, binding to the booking, or server policy response occurs in this screen (`:145–151,199–227`). The non-injection path bypasses this gate entirely.

Sorting is client-triggered but the implementation sends `sort` back to the provider endpoint; reset sends `any`, while the displayed sort label maps only nearest/highest_rated/else all (`:48–54,165–193`). No explicit empty-state UI exists after loading, and filters other than sort are fixed from initial route params rather than interactively editable. No Phase 0 remediation was made.
