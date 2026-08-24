# Phase 0B semantic evidence — duplicate FraudAlert schemas

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Members read:**
- `src/modules/admin-web-core/schemas/fraud-alert.schema.ts`, lines 2–24
- `src/schemas/fraud-alert.schema.ts`, lines 2–28

## Admin Web Core model

Lines 2–4 import Document and define FraudAlertDocument. Lines 6–24 define a timestamped FraudAlert without an explicit collection name. It stores required `entityId` and `entityName` (8–12), a required type limited to doctor/pharmacy/home_care/patient (14–15), free-text `flagReason` (17–18), and severity limited to high/medium/low (20–21).

## Root schema model

Lines 2–5 import Document/uuid and define the same exported class name. Lines 7–10 explicitly target `fraud_alerts` and generate a unique id. It stores required indexed userId and providerId (12–16), flagType enum (18–19) whose declared enum omits `payment_velocity_abuse` even though the TypeScript union includes it, confidenceScore (21–22), and status pending/flagged/dismissed (24–25).

## Audit judgment

These are distinct `FraudAlert` classes with different field sets, collection metadata, identifiers, enums and lifecycle semantics under the same domain name. The admin model has no explicit collection, while the root model explicitly uses `fraud_alerts`; Mongoose naming/registration may therefore create divergent collection behavior depending on module registration. One model is entity/type/severity oriented and the other is user/provider/flag/status oriented. The root enum/union inconsistency can reject `payment_velocity_abuse` despite the TypeScript type. Neither model defines event/source correlation, idempotency/deduplication key, actor/audit resolution, evidence payload, expiry or unique business rule for repeated alerts.

**Confirmed candidate finding:** duplicate FraudAlert domain models with incompatible schemas and lifecycle/collection semantics; separate finding for enum/union drift and absence of deduplication/audit identity.

No product code was changed and no tests were executed during this semantic read.
