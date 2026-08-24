# Semantic evidence — Patient Web medicines

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Medicine list

Source: `app/[locale]/medicines/page.tsx`.

The page requires patient access, validates locale and search input through the medicine parser, calls `getPatientMedicines`, and renders server-backed medicine rows with identifier links, names, active ingredient, form/strength and prescription-required flag. It handles auth redirect, forbidden/not-found, unavailable/retry and empty states. The page has search only; no add-to-cart or purchase CTA is present.

## Medicine detail

Source: `app/[locale]/medicines/[medicineId]/page.tsx`.

The detail page validates the medicine identifier, fetches public data, renders parsed clinical facts and a `MedicalWebPage` JSON-LD object, and treats missing/invalid public data as not-found or unavailable/retry. Metadata builds localized canonical/alternate links but explicitly sets `robots: noindex, nofollow` at lines 21 and 34–36 because the public entity/published contract is not considered reliable. This is a deliberate SEO safety gate, not an accidental indexing failure.

The detail page links back to `/medicine-catalog`, displays clinical facts and a notice, but contains no price, stock, pharmacy selection, prescription upload, cart CTA or checkout path. Thus medicine detail is catalog information only; it does not establish the pharmacy purchase journey. The exact catalog route mismatch between `/medicines` and `/medicine-catalog` must be checked in the broader route map.

No Phase 0 remediation was made.
