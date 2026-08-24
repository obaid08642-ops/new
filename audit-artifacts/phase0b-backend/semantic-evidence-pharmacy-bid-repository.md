# Phase 0B semantic evidence — pharmacybid.repository.ts

**Archive member:** `src/modules/orders/repositories/pharmacybid.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyBid from the order schema. Lines 8–13 define an injectable `PharmacyBidRepository` extending `MongoRepository<any>` and pass the named PharmacyBid model with `Model<any>` to the superclass.

**Behavioral scope:** The repository erases the PharmacyBid type to `any` and implements no custom order/pharmacy/provider ownership, bid uniqueness, response deadline/expiry, amount/currency validation, acceptance CAS, cancellation, projection, transaction, idempotency or audit behavior.

**Integrity/financial implications:** A generic-any wrapper around pharmacy bids weakens compile-time contract protection and does not ensure bids are tied to the authenticated pharmacy or target order. It cannot itself prevent duplicate bids, stale acceptance, price manipulation, expired offers, repeated acceptance or cross-order reads/writes.

**Test implications:** verify model token/collection mapping, typed bid shape, order/pharmacy ownership, one-bid/attempt uniqueness, expiry/deadline, amount/currency invariants, acceptance CAS, replay/idempotency, private projections and audit linkage. No tests executed during this semantic read.
