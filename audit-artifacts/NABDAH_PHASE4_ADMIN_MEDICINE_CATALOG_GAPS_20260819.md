# Phase 4 Admin Dashboard — medicine catalog governance gaps

## Confirmed positive behavior

The catalog uses a paginated API, supports soft delete/restore, and reloads the catalog after a confirmed request. It does not seed medicine reviews or ratings.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | One admin form can publish clinical drug information and Rx status without clinical approval workflow | Create/edit permits direct modification of indications, contraindications, warnings, side effects, usage, dosage-adjacent text, active ingredient and `requires_prescription`; UI records no source, clinical reviewer, effective date/version, evidence or maker-checker decision. | Establish approved drug-data governance with licensed source/provenance, field-level clinical review/versioning, high-risk dual approval, publication/rollback state and audit trail before patient/provider exposure. |
| **P1** | Medicine-image upload requests `public_read` storage from browser | Client base64-uploads any selected image then consumes a signed URL; UI has no file size/content scanning, copyright/provenance, moderation or storage lifecycle evidence. | Enforce server-side MIME/content/size/malware validation, provenance/moderation, authorized upload, appropriate delivery policy and immutable asset-to-catalog audit. |
| **P1** | Availability shortage badge is an unscoped admin assertion | One click marks “may be unavailable” without pharmacy/location/inventory evidence, expiry, reason, verification or patient/provider communication state. | Bind shortages to verified location-specific inventory/evidence, time-to-live, reviewer and audit; distinguish informational reports from confirmed availability. |
| **P1** | Provider/guest change requests allow arbitrary field overrides and generic rejection reason | UI can override selected values without schema/risk classification; rejection always sends `رفض إداري` and list failures become empty lists. | Use typed allowlisted request fields, clinical/financial risk tiers, mandatory contextual reason, actor/version/audit and explicit unavailable/stale/retry states. |
| **P1** | Catalog medical content supports only Arabic/English | Clinical attributes and controls omit Urdu, Hindi, Bengali and Filipino, with no controlled translation review/version. | Implement source-linked, clinically reviewed six-language content and accessible RTL/LTR display; never rely on free-text machine translation for safety fields. |

## Decision

Medicine catalog administration is **P0 FIX/BLOCKED**. It cannot safely publish or change patient-facing medicine information until clinically governed, versioned and auditable workflows replace direct generic edits.
