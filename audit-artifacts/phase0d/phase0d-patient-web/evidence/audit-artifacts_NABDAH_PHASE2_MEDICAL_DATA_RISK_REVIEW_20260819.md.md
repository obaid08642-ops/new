# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE2_MEDICAL_DATA_RISK_REVIEW_20260819.md`
- **Member SHA-256:** `83ba829c22a0b1518dcca1a0d676b073b1db9316db95dd61786f383c50e8da49`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: A focused source scan across maternity, nutrition, diagnostics booking, and mental-health assessment confirms that synthetic medical values are concentrated in the main Patient implementation and must remain remediation/blocker findings rat`
- `11: | Diagnostics booking confirmation | `homeVisitFee = 50`, VAT computed locally, `scheduled_at = Date.now()+24h`, fallback provider id `provider_lab_default`, and example document URL `https://example.com/doctor_request.pdf` are sent in the `
### backend_consumers_or_contracts
- `11: | Diagnostics booking confirmation | `homeVisitFee = 50`, VAT computed locally, `scheduled_at = Date.now()+24h`, fallback provider id `provider_lab_default`, and example document URL `https://example.com/doctor_request.pdf` are sent in the `
### auth_ownership
- `12: | Mental-health self-assessment | Questions are declared as dynamically fetched; no fabricated questions were confirmed in this focused scan | **SOURCE PRESENT / SAFETY VERIFY** | Consent, crisis-safe handling, response ownership, and backe`
### state_transitions
- `9: | Maternity hub | Local-storage fallback and optimistic local checkup/profile updates; default checkup collection is used when backend data is absent | **FIX / MEDICAL-SAFETY REVIEW** | Backend-confirmed profile/checkup state, no fabricated`
- `10: | Nutrition AI plan builder | Real multi-step input and API flow already exists; no synthetic clinical profile was newly confirmed in this focused scan | **SOURCE PRESENT / VERIFY** | API response schema, loading/error/empty states, safety `
- `12: | Mental-health self-assessment | Questions are declared as dynamically fetched; no fabricated questions were confirmed in this focused scan | **SOURCE PRESENT / SAFETY VERIFY** | Consent, crisis-safe handling, response ownership, and backe`
- `16: The diagnostics hardcoded fee, VAT, tomorrow-date scheduling, provider fallback, and example document URL are confirmed source risks and remain in the remediation queue. The maternity local fallback/optimistic medical state is also not acce`
### payment_insurance_relevance
- `11: | Diagnostics booking confirmation | `homeVisitFee = 50`, VAT computed locally, `scheduled_at = Date.now()+24h`, fallback provider id `provider_lab_default`, and example document URL `https://example.com/doctor_request.pdf` are sent in the `
### error_empty_loading_retry_cancel
- `9: | Maternity hub | Local-storage fallback and optimistic local checkup/profile updates; default checkup collection is used when backend data is absent | **FIX / MEDICAL-SAFETY REVIEW** | Backend-confirmed profile/checkup state, no fabricated`
- `10: | Nutrition AI plan builder | Real multi-step input and API flow already exists; no synthetic clinical profile was newly confirmed in this focused scan | **SOURCE PRESENT / VERIFY** | API response schema, loading/error/empty states, safety `
- `12: | Mental-health self-assessment | Questions are declared as dynamically fetched; no fabricated questions were confirmed in this focused scan | **SOURCE PRESENT / SAFETY VERIFY** | Consent, crisis-safe handling, response ownership, and backe`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
