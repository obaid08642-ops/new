# Phase 0B semantic evidence — provider/schemas/index.ts

**Archive member:** `src/modules/provider/schemas/index.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–208; full 208-line member covered.

Lines 2–4 import Mongoose Document/UUID and provider enum types. Lines 6–28 define `ProviderAccount` in `provider_accounts`: unique UUID/email, sparse unique phone, password_hash, provider type/status, verification/login lock fields, approval/rejection fields, untyped status_history and onboarding_progress. Indexing is status/createdAt. Security-relevant account lifecycle fields exist, but the schema does not show password policy, status transition enforcement, audit immutability, or account/session revocation semantics.

Lines 29–40 define `ProviderSession` in `provider_sessions` with unique UUID, provider_account_id, device_identifier, refresh_token_hash, active/revoked status and expires_at, plus provider/status index. The schema stores a hash rather than raw refresh token, but no device binding semantics, rotation/reuse detection, revoked-at/reason, IP/user-agent or compound expiry index is encoded.

Lines 42–77 define `ProviderProfile` in `provider_profiles`: unique ID/account, provider type, bilingual/display/legal data, image IDs, commercial/tax/medical/facility license numbers, experience fields, free-form phones/social/address/geo objects, delivery flags/fee/ETA, enabled modules, default commission_rate 10 and profile completeness default 0. No active/approved/public visibility state, currency, rate bounds, license expiry/review state, or privacy projection is visible. The commission default is a hard-coded financial policy candidate.

Lines 78–96 define `ProviderDocument` and review status. It binds account_id/doc type/storage object ID, optional document metadata and review fields, default pending, with account/type index. No storage ownership/signing policy, expiry enforcement, reviewer role/separation, immutable review history, content scan or replacement version is visible.

Lines 98–113 define a static `SAUDI_BANKS` list including named institutions and `other`. Lines 114–130 define `ProviderBankAccount` with unique account ID and unique account_id, bank code/name, holder, uppercase IBAN, optional VAT/IBAN storage ID, review status default pending and reviewer fields. No bank-code allowlist binding, IBAN checksum/country validation, encryption/tokenization, account ownership proof, payout lock, currency, reviewer separation or history is visible. Bank names are duplicated in client/server-facing schema fields and can drift from code list.

Lines 131–153 define `ProviderOperator` with unique ID, provider account, normalized unique-by-provider email, phone/name, enum role, permissions array, status lifecycle invited/active/disabled/revoked, optional password hash/invite token/expiry, acceptance/login and disable metadata. Compound unique provider/email index exists. No permission subset hierarchy, token hash requirement, invite replay control, session invalidation, actor audit or provider tenant enforcement is encoded.

Lines 155–175 define Provider OTP purposes/statuses and `ProviderOtpCode`: unique ID, normalized indexed email, purpose/status, code_hash, attempts, required expires_at, consumed/sent timestamps and IP/user-agent. Index is email/purpose/status. Hash field and expiry exist, but uniqueness per active purpose, atomic consume, max attempts/rate limiting, account binding and retention/deletion are not encoded.

Lines 177–193 define `ProviderAuditLog` with unique ID, optional provider account, required actor ID/role/action, arbitrary target/before/after/meta, IP/user agent, and provider/createdAt index. No append-only/tamper evidence, event correlation, retention, sensitive-field redaction or mandatory provider tenant binding is visible.

Lines 195–208 define a second `ProviderDelta` model in the same file, with unique ID, indexed provider_id, arbitrary required requested_changes described as prices/radius/accepted insurances, status pending/approved/rejected, reviewer fields, and provider/status index. This is distinct from the separately read `src/modules/providers/schemas/provider-delta.schema.ts`, which uses providerId/oldData/newData and different status casing. The duplicate domain models and collection naming require cross-module mapping verification; unrestricted requested_changes and missing base revision/atomic apply are material risks.

**Exports/wiring:** Lines 173–174 re-export capabilities and requests schemas, while the file itself supplies account/session/profile/document/bank/operator/OTP/audit/delta schemas used by ProviderModule. The broad schema index centralizes high-impact identity, financial, staff and audit models.

**Test implications:** require account/session lifecycle and refresh-token rotation tests; profile public/private/license/commission tests; document storage/expiry/reviewer tests; bank validation/encryption/payout tests; operator permission/invite/revocation tests; OTP atomic TTL/attempt/rate/replay tests; append-only audit/tamper/redaction tests; and duplicate ProviderDelta mapping/transition/atomicity tests. No tests executed during this semantic read.
