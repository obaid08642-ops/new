# Phase 0B semantic evidence — PharmacyBroadcastService

**Archive member:** `src/modules/pharmacy/services/pharmacy-broadcast.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–254 and 256–564 from the baseline archive extraction; the second range closed the truncation boundary.

Lines 2–60 define broadcast dependencies, pharmacy/order/allocation/broadcast/inventory/provider/system config/shortage/medicine repositories, geo, SmartSplit, notifications, chat, EventBus, and Redis. Lines 62–74 read broadcast stages from SystemConfig, with a default fallback of radii 3/5/10 km and 90-second timeouts.

Lines 76–116 implement start and broadcastRound. Existing open broadcasts are reused; otherwise a broadcast is created with patient identity, round/radius data, open lock, and timeline. Pharmacies within current radius are discovered, notified, deduplicated in notified_pharmacies, and persisted. Order status moves to BROADCASTING and an event is emitted.

Lines 118–212 implement full acceptance. Provider role, broadcast existence, and notified-pharmacy membership are required. Redis SET NX/PX 5-second lock plus Mongo open-state conditional update provide winner-take-all behavior. The winner response is recorded, inventory is looked up/reserved, shortage acceptance is logged, a pending-review allocation is materialized with inventory prices and 12-minute review expiry, the order is set FULLY_ALLOCATED, notifications are sent, and losing pharmacies are cancelled. Lock release after downstream failure is not visible.

Lines 214–254 implement partial response. Provider role, open broadcast, and notified membership are required; existing response from the same pharmacy is replaced. Client item availability, quantities, unit prices, alternatives, ETA, and delivery fee are persisted. Chat threads/messages are opened for unavailable/alternative items; available items log shortage acceptance. BROADCASTING may become AWAITING_FULL_ACCEPTANCE.

Lines 256–280 implement rejection. Provider role, broadcast openness, and notified membership are required; response is replaced with declined and every order medicine is logged as rejected to shortage engine. Lines 283–312 advance rounds from configured stages, and final round invokes Best Partial Match or fallback Smart Split.

Lines 314–436 implement Best Partial Match. Partial responses rank by available item count, distance, and alternative count. Broadcast is locked, one allocation is created with available/substitute/unavailable items and client response prices, order moves to NEGOTIATING_SUBSTITUTES, chat is opened for substitute/unavailable items, patient/losing-provider notifications are sent, and result is returned.

Lines 438–455 implement fallbackSplit. Broadcast is marked fallback, order becomes ALLOCATING, SmartSplit runs, patient notification and event follow. Lines 457–485 discover approved/available pharmacies within radius and apply delivery-mode radius rules: external delivery caps at 7 km and self-delivery expands to at least 20 km. Lines 487–529 implement provider list/detail with patient name/phone resolution; list returns open broadcasts notified to provider, detail checks provider notification or patient ownership but returns 403 for foreign users. Lines 532–564 sweep open broadcasts by configured timeout, advances rounds or runs Best Partial Match, and returns scan/advance/fallback/no-pharmacy counts.

**Auth/ownership:** provider role and broadcast membership are enforced on claim/partial/reject/list/detail; patient ownership is enforced on detail; administrative round/expiry methods have no visible auth in this service.

**State transitions:** open broadcast → locked/fallback; order BROADCASTING → AWAITING_FULL_ACCEPTANCE/FULLY_ALLOCATED/NEGOTIATING_SUBSTITUTES/ALLOCATING; configured rounds and timeout-driven fallback.

**Price/payment/insurance source:** inventory price for full accept; client response unit prices/delivery fee/copay-adjacent fields for partial/best-match paths; no payment/refund logic visible.

**Security/truthfulness observations:** partial/best-match prices and quantities are client-provided; no visible idempotency key beyond locks/response replacement; locks may remain until TTL after failure; provider list/detail exposes patient name/phone to notified pharmacies; admin-like advance/expiry methods lack visible authorization; events/notifications swallow errors; default stage/radius/timeout fallbacks are embedded.

**Test implications:** provider owner/stranger/unauth, concurrent full claims, lock failure recovery, inventory race/rollback, partial replay, client price/quantity tampering, substitute chat privacy, round timeout/replay, best-match ranking, fallback SmartSplit, patient/provider detail isolation, and admin expiry authorization. No tests executed during this semantic read.

**Consumer traceability:** deferred to dedicated route-to-consumer phase.
