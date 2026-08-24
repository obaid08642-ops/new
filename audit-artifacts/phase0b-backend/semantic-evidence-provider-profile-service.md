# Phase 0B semantic evidence — provider-profile.service.ts

**Archive member:** `src/modules/provider/services/provider-profile.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–216; full 216-line member covered.

## Profile and contacts

Lines 2–31 import provider account/profile/document/bank/audit schemas, status enums, storage, repositories, UUID and Mongo connection; construct the service with repositories, connection and storage. Lines 33–56 get and update profiles. Updates use an allowlist but accept arbitrary value types, recompute completeness, save, and audit; hospital/clinic modules are filtered against an allowlist. Lines 58–62 calculate completeness from seven boolean checks, treating any truthy latitude as location completeness and requiring either commercial registration or medical license.

Lines 64–89 add/remove phones. Types are allowlisted, maximum five enforced, primary phone is maintained, default country code is `+966`, and add is audited. Remove is scoped by account but has no visible audit event and uses read-modify-save without concurrency control.

## KYC documents

Lines 91–115 validate document type and base64/mime presence, upload provider-owned content to private Cloudinary through StorageService, replace an existing pending/needs-replacement/under-review document of the same type or create a new record, reset review metadata on replacement, and audit upload/replacement. File size, MIME allowlist, content scanning, document number/date consistency, expiry rules and transaction/compensation are not visible.

Lines 117–124 list account-scoped documents, load account provider type, derive required document types and return documents/required/missing. The returned list excludes `_id` and `__v` but still depends on storage access policy downstream.

## Banking and approval

Lines 126–148 validate Saudi IBAN shape, verify bank code against static `SAUDI_BANKS`, update or create one bank record, reset review state on update, and expose `banks_list`. IBAN is stored in the provider bank record; no encryption/redaction/tokenization or account-owner verification is visible.

Lines 150–178 submit an eligible account for approval after checking email, profile, phone, city, required document presence and bank existence. It transitions EMAIL_VERIFIED through ONBOARDING to PENDING_ADMIN_APPROVAL, records onboarding progress, saves, and writes the same `onboarding.submitted` audit action twice consecutively at lines 175–176.

## Delta and directory

Lines 180–200 unwrap `changes` or `newData` payloads when narrowly wrapped, otherwise store arbitrary body as requested changes in `provider_deltas` with UUID, provider ID, pending status and timestamps, insert directly through the connection, audit and return the full delta. No allowlist, validation, idempotency, approval-state transition or atomic audit behavior is visible.

Lines 202–215 return up to 50 doctor accounts and matching profiles, with name fallback `طبيب` and empty specialty/hospital values. The query filters only provider type `doctor`, with no visible approved/active/public/tenant filter, pagination or privacy policy.

## Confirmed findings

**Authorization/ownership:** most profile/KYC/bank methods use `user.id` but do not perform an explicit role/actor assertion in this member; security depends on controllers. Directory is broad and lacks approval/active/public filtering. `banks_list` is global static data.

**Integrity:** profile/phone/document/bank/approval/delta operations are sequential read-modify-write flows without visible CAS/idempotency/transaction/outbox. Approval audit is duplicated. Document replacement can leave old storage objects and DB state inconsistent if later operations fail.

**Privacy/security:** bank IBAN and KYC metadata are stored and returned without visible encryption/redaction; document upload trusts client MIME/base64 and lacks size/content scanning. Directory fallback values may mask missing real data, though no random/fabricated specialty is added.

**Truthfulness:** completeness is a simplistic presentation metric, not proof of licensing or approval. Required document presence counts records regardless of review status/expiry. `onboarding_progress.documents: true` is set after presence only. Static bank list and provider directory fields are not evidence of verified operational availability.

**Test implications:** require owner/stranger/unauth/controller tests, strict DTO/type/size/MIME/content validation, signed private document access, IBAN protection, atomic approval/audit, duplicate-audit detection, concurrent phone/bank/document updates, delta schema/idempotency, directory approval/active/privacy filtering, and review-status/expiry-aware onboarding. No tests executed during this semantic read.
