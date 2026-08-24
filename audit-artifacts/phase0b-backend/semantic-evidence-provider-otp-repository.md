# Phase 0B semantic evidence — providerotpcode.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerotpcode.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–12; full 12-line member covered.

Lines 2–5 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderOtpCode. Lines 7–12 define an injectable repository extending `MongoRepository<ProviderOtpCode>` and pass the named ProviderOtpCode model to the superclass.

**Behavioral scope:** No custom OTP hash comparison, TTL/expiry predicate, one-time consume compare-and-set, attempt counter, provider/account binding, rate-limit, replay prevention, deletion or audit behavior is implemented here. All OTP security semantics are delegated to callers/schema/database.

**Security implications:** A generic CRUD repository around OTP records does not itself prevent plaintext lookup, expired-code acceptance, multi-use/replay, cross-account retrieval or brute-force attempts. The provider OTP service must prove these controls and must not expose raw code fields.

**Test implications:** verify model token resolution, hashed-at-rest codes, strict expiry, one-time atomic consumption, account/phone binding, attempt limits, rate limiting, replay rejection, redaction and audit events. No tests executed during this semantic read.
