# Phase 0B semantic evidence — pharmacychatmessage.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacychatmessage.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyChatMessage from the Pharmacy schema. Lines 8–13 define an injectable `PharmacyChatMessageRepository` extending `MongoRepository<PharmacyChatMessage>` and pass the named PharmacyChatMessage model to the superclass.

**Behavioral scope:** No custom conversation membership, sender authenticity, pharmacy/patient tenant scope, message visibility, ordering/cursor, edit/delete policy, read/seen state, attachment safety, deduplication, idempotency, transaction or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Security/PII implications:** Generic message CRUD does not itself prevent cross-conversation reads/writes, forged sender IDs, message tampering, exposure of patient/pharmacy clinical or contact information, or repeated message delivery. Chat consumers need server-derived sender identity, membership checks, safe attachment handling and durable ordering/deduplication.

**Test implications:** verify model/collection mapping, conversation membership and tenant scope, sender binding, private projection, cursor ordering, edit/delete authorization, read state, attachment controls, replay/deduplication, concurrency and audit linkage. No tests executed during this semantic read.
