# Phase 0B semantic evidence — providerbankaccount.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerbankaccount.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, generic `MongoRepository` and the `ProviderBankAccount` schema. Lines 8–13 define `ProviderBankAccountRepository` as a thin subclass of `MongoRepository<ProviderBankAccount>` and pass the injected model to the base constructor.

**Semantic behavior:** no account ownership filter, bank-review/status policy, IBAN projection/redaction/encryption, duplicate prevention, version/CAS, soft-delete, tenant boundary, transaction/session support or audit behavior is added here.

**Security/ownership:** the repository does not prove that bank records are accessible only to the owning provider or authorized reviewer, nor that IBAN is protected in reads/logs. These controls must come from callers, schema and base repository.

**Truthfulness/compliance:** no bank-code/IBAN validation, holder verification, account proof, review or settlement semantics are added in this member.

**Test implications:** verify base repository and all bank consumers for owner/admin separation, secret projection, encryption/tokenization, review-state predicates, duplicate account behavior, CAS/transactions and audit. No tests executed during this semantic read.
