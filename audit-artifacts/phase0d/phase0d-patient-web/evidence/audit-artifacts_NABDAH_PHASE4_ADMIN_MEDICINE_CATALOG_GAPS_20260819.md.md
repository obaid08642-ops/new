# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE4_ADMIN_MEDICINE_CATALOG_GAPS_20260819.md`
- **Member SHA-256:** `17fe7f4e24e8940556495636e7172c7c535fcaccf9a11cfa7d21bce1a8f5d295`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: | **P1** | Medicine-image upload requests `public_read` storage from browser | Client base64-uploads any selected image then consumes a signed URL; UI has no file size/content scanning, copyright/provenance, moderation or storage lifecycle `
- `14: | **P1** | Provider/guest change requests allow arbitrary field overrides and generic rejection reason | UI can override selected values without schema/risk classification; rejection always sends `رفض إداري` and list failures become empty l`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 4 Admin Dashboard — medicine catalog governance gaps`
- `11: | **P0** | One admin form can publish clinical drug information and Rx status without clinical approval workflow | Create/edit permits direct modification of indications, contraindications, warnings, side effects, usage, dosage-adjacent tex`
- `13: | **P1** | Availability shortage badge is an unscoped admin assertion | One click marks “may be unavailable” without pharmacy/location/inventory evidence, expiry, reason, verification or patient/provider communication state. | Bind shortage`
- `19: Medicine catalog administration is **P0 FIX/BLOCKED**. It cannot safely publish or change patient-facing medicine information until clinically governed, versioned and auditable workflows replace direct generic edits.`
### state_transitions
- `3: ## Confirmed positive behavior`
- `5: The catalog uses a paginated API, supports soft delete/restore, and reloads the catalog after a confirmed request. It does not seed medicine reviews or ratings.`
- `7: ## Confirmed defects`
- `11: | **P0** | One admin form can publish clinical drug information and Rx status without clinical approval workflow | Create/edit permits direct modification of indications, contraindications, warnings, side effects, usage, dosage-adjacent tex`
- `13: | **P1** | Availability shortage badge is an unscoped admin assertion | One click marks “may be unavailable” without pharmacy/location/inventory evidence, expiry, reason, verification or patient/provider communication state. | Bind shortage`
- `14: | **P1** | Provider/guest change requests allow arbitrary field overrides and generic rejection reason | UI can override selected values without schema/risk classification; rejection always sends `رفض إداري` and list failures become empty l`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: | **P1** | Provider/guest change requests allow arbitrary field overrides and generic rejection reason | UI can override selected values without schema/risk classification; rejection always sends `رفض إداري` and list failures become empty l`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
