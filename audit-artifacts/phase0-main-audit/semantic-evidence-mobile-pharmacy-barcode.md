# Semantic evidence — Mobile Pharmacy Barcode Scanner

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:25–58` captures a camera image as base64 and posts it to `/ai/medicine-image-search`, then searches `/medicines?search={name}&limit=5` and routes the first result to Product Detail. The camera permission flow is visible (`:111–163`), with no explicit denial recovery beyond a button, and no file size/content/privacy policy for base64 image transmission. AI failures show an error, but there is no request timeout, rate-limit, consent/retention disclosure, result confidence, or user confirmation before choosing the first search result.

Barcode lookup posts to `/medicines/by-barcode/{code}` (`:60–85`). Any non-found response and any thrown network/server error both set `notFound` (`:76–80`), conflating “barcode absent” with “service unavailable/unauthorized”. A found medicine is transformed with `available: true` regardless of a backend availability field (`:64–75`), and its price is silently nulled when absent/non-positive; product identity, currency, stock freshness and prescription metadata are not schema-validated. The scan lock is a local ref and reset is local (`:87–94`), with no duplicate request idempotency or lifecycle handling on unmount/background.

The result button routes using `result.id || result.barcode` (`:96–98`), so a barcode can be passed as a detail ID without proving that Product Detail accepts that identifier. AI no-result routes to generic `/search` (`:44–51`), while manual fallback routes to `/pharmacy/drug-not-found` (`:159–162,201–216`); these paths do not preserve image/barcode evidence or explicit provenance. No Phase 0 remediation was made.
