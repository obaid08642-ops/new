# Semantic evidence — Mobile Pharmacy Medicine Compare

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/medicine-compare.tsx:33–45` derives IDs from the route parameter, but defaults to `['1', '2']` when `params.ids` is absent (`:36`). This is an explicit synthetic/test fallback that can show or request unintended products. IDs are split without validation, length limits, deduplication or ownership/context checks. The POST call to `/medicines/compare` uses an alternate `apiFetch` argument shape (`:37`) that requires utility signature verification; no visible loading error/empty state is rendered when the request fails or returns no array.

Comparison values are read directly from untyped response objects under `@ts-nocheck` (`:80–105`). Missing values are collapsed to “غير متوفر”, while `getBetter` treats missing price/rating as zero and labels one product “أفضل” using only the first two array elements (`:47–51,88–100`), with no currency, stock, freshness, evidence, tie or medical-equivalence semantics. The header uses `m.emoji` (`:68–75`) despite the platform’s no-emoji product requirement and without a verified image/icon field.

The “أضف للسلة” controls render but their handler is an empty comment (`:108–119`); no cart mutation, product ID validation, prescription/stock/price check, server quote or idempotency exists. There is no direct detail navigation, retry, removal/edit of comparison set, or handling for more than two products. This screen is not a complete purchasable journey. No Phase 0 remediation was made.
