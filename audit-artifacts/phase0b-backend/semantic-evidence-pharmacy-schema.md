# Phase 0B semantic evidence — pharmacy.schema.ts

**Archive member:** `src/modules/pharmacy/schemas/pharmacy.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–230 and 231–407 from the baseline archive extraction; the second range closed the truncation boundary.

Lines 2–13 declare the pharmacy domain schema scope and state that `provider_capabilities_pharmacy` is the stock source of truth. Lines 14–68 define order, allocation, prescription intake, item action, and item match enums. Lines 70–88 define the PharmacyOrder transition table, including draft/intake/broadcast/negotiation/allocation/manual review/confirmed/fulfillment/delivery/completed/cancelled paths. Lines 90–101 define allocation transitions from pending review through confirmed/preparing/pickup/out-for-delivery/delivered/rejected/cancelled/expired.

Lines 103–199 define PharmacyOrder. Required unique string ID and indexed patient/status fields are persisted with embedded item objects, delivery address/geo, notes, prescription attachments, totals, fee fields, insurance details, provider basket/evaluation, allocation IDs, split metadata, schedule, explainability snapshot, timeline, and cancellation reason. An index supports patient/status/createdAt listing.

Lines 200–254 define PharmacyAllocation. It stores order/provider IDs, indexed status, item-level available/substitute/unavailable decisions, quantities/prices, totals, distance, preparation SLA, review expiry, delivery metadata, timeline, provider notes, match breakdown, cancellation/rejection reasons, and indexes for provider/status and order/provider.

Lines 255–276 define PrescriptionIntake with patient ownership, input type, source URI/base64/raw text/parser metadata, queued/processing/parsed/failed/manual-review/completed state, parsed/unresolved items, confidence/error/process time, and patient/status index.

Lines 277–290 define PharmacySubstituteMap with brand SKU, generic name, substitute brands, dosage/form, manual/imported source, and generic/dosage index. Lines 291–306 define PharmacyLowStockAlert with pharmacy/inventory ownership, SKU/name/current stock/threshold, open/acknowledged/restocked state, timestamps, and pharmacy/status index.

Lines 309–345 define PharmacyBroadcast. It stores unique order ID/patient ID, current round/radius/max radius/round radii, open/locked/fallback/closed lock state, winner, responses with per-item availability/quantity/unit price/alternative metadata/ETA/fee, notified pharmacies, timeline, and lock-state/round index.

Lines 346–375 define PharmacyChatThread and PharmacyChatMessage. Threads store order/item/patient/pharmacy participants, open/closed/archived state, last-message/auto-close timestamps, and resolution. Messages store thread/sender identity and role, text/image URI/substitute offer, blocked marker/reason, and thread/createdAt index.

Lines 377–407 define DrugShortageFlag and exported `PHARMACY_SCHEMAS`. Flags support SKU/generic/name/dosage/form, admin/pharmacy source, reporter, pending/approved/rejected/resolved state, reason, approval, and resolution metadata.

**Auth/ownership:** schema fields encode patient, pharmacy, provider, and thread participants but do not enforce ownership behavior; service/controller predicates provide that layer.

**State transitions:** explicit order/allocation tables are the domain contract; schema enum validation constrains persisted states but transition enforcement is external.

**Price/payment/insurance source:** totals/fee/price fields exist on order/allocation/broadcast items; insurance details/status/copay/evaluation are persisted; schema does not enforce server-side pricing or financial invariants.

**Security/truthfulness observations:** several embedded objects use `Object`/`any` and accept URI/base64, delivery/courier data, insurance evaluation, alternatives, and timelines without field-level validators; no schema-level idempotency key or unique claim exists for most mutations; broadcast lock has state fields but no TTL/index visible; chat substitute offer includes client price; prescription intake stores raw/base64 content; allocation/order totals are mutable embedded numbers.

**Test implications:** enum transition coverage, unique/index behavior, ownership fields, embedded payload validation, prices/insurance invariants, broadcast lock concurrency/expiry, chat participant privacy, prescription payload limits, and idempotency/replay. No tests executed during this semantic read.

**Consumer traceability:** schema-to-service/controller mapping will feed the dedicated route-to-consumer phase.
