# Phase 0B semantic evidence — providerdocument.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerdocument.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, generic `MongoRepository` and the `ProviderDocument` schema. Lines 8–13 define `ProviderDocumentRepository` as a thin subclass of `MongoRepository<ProviderDocument>` and pass the injected model to the base constructor.

**Semantic behavior:** no provider-account filter, review-status/expiry policy, document projection, signed-storage access policy, file-reference validation, uniqueness, version/CAS, soft-delete, tenant boundary, transaction/session support or audit behavior is added here.

**Security/ownership:** the repository itself does not prove that KYC documents are accessible only to the owning provider or authorized admin reviewer, nor that storage IDs/URLs are protected. Those guarantees must come from callers, StorageService and the base repository.

**Truthfulness/compliance:** no verification of document identity, issuer, dates, required-document completeness or review state is present in this member.

**Test implications:** verify base repository and all document consumers for owner/stranger/unauth/admin separation, review/expiry predicates, signed private access, projection/redaction, duplicate records, soft delete, CAS/transactions and audit. No tests executed during this semantic read.
