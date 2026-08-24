# Semantic evidence — Mobile Pharmacy Product Search

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/pharmacy/product-search.tsx:1–5` contains no pharmacy-specific search implementation. The route immediately redirects to the shared `/search` surface. Therefore product search behavior, query normalization, medication-specific filters, barcode/AI lookup, pagination, result identity, loading/empty/error states, prescription flags, stock/price freshness and detail navigation must be audited in the shared search implementation and reconciled with the pharmacy entry points; this file itself does not prove any of those contracts.

The redirect does not pass a pharmacy scope, category, locale, or preserved search state. This creates a parity risk: entering the pharmacy-specific route may lose the patient’s intended context and expose general search results rather than medicine-only results. The route also provides no explicit not-found or retry behavior because all behavior is delegated. No Phase 0 remediation was made.
