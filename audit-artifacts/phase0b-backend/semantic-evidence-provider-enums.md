# Phase 0B semantic evidence — provider.enums.ts

**Archive member:** `src/modules/provider/provider.enums.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–91; full 91-line member covered.

Lines 2–8 define provider types and hospital sub-modules. Lines 10–16 define provider document types. Lines 18–33 map each provider type to required documents. Lines 35–40 define provider account statuses from email-unverified through approved/suspended/rejected. Lines 42–52 define the directed status-transition map. Lines 54–59 define operator roles. Lines 61–76 define granular operator permissions. Lines 78–91 define default permission sets, with OWNER receiving all permissions and ADMIN receiving all except `operators.manage`.

**State correctness:** the transition map is explicit and directed, but it does not itself enforce CAS/versioning, actor eligibility, review prerequisites, suspension reason or reactivation controls. `APPROVED -> SUSPENDED` and `SUSPENDED -> APPROVED/REJECTED` are permitted; rejected can re-enter pending approval. Consumers must not treat enum membership as proof that a transition was safely persisted.

**KYC/compliance:** required-document mapping is static and presence-oriented; it does not encode expiry, review status, issuer, jurisdiction, identity matching or document substitution rules. Several provider types require an IBAN letter but the enum does not define financial verification semantics.

**Authorization:** OWNER receives `ALL_PERMS`; ADMIN receives all permissions except operator management, including KYC, bank, insurance, finance, payouts and audit capabilities. The enum defines available permission vocabulary/defaults but does not establish role hierarchy, permission ceilings for custom assignments, separation of duties, approval workflow or tenant boundaries. ProviderOperatorsService accepts filtered caller-supplied permissions, so consumers must enforce role-permission policy beyond enum membership.

**Consistency/truthfulness:** multiple provider types and hospital submodules create cross-module capability surface. The enum cannot prove that every consumer uses the same status/role/permission vocabulary or that an active/approved account is operationally licensed.

**Price/payment/insurance source:** permission names include finance/payouts and insurance decisions, but no amount, ledger, claim or settlement semantics are defined.

**Test implications:** require exhaustive transition tests, actor/role/permission matrix, OWNER/ADMIN separation-of-duties tests, custom-permission ceiling tests, required-document review/expiry tests, provider-type coverage, serialization compatibility and consumer vocabulary consistency. No tests executed during this semantic read.
