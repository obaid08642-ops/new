# Insurance copay cap: P1 (code review, not yet reproduced at runtime)

Scenario: D-04 (book with insurance, copay and cap estimate). Found while reading the insurance path on 2026-10-29. Not reproduced at runtime; the journey for it is not written yet.

| ID | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| INS-CAP-1 | P1 | The patient's copay cap from the insurance card is not applied to insurance requests. The copay is `price × provider percent ÷ 100`, with no cap. | `backend/src/modules/insurance-engine/insurance-engine.module.ts:643-653` (decide: `approve_partial`, copay from `copay_percent` or `copay_amount` only). The cap is stored on the patient's policy (`backend/src/schemas/patient-profile.schema.ts:102`, `backend/src/modules/insurance/insurance.dto.ts:9`), and read only by pharmacy ordering (`backend/src/modules/ordering/ordering.service.ts:39`). | Apply `min(copay, copay_cap_sar)` in the insurance decide path, as ordering does. |

Expected check, once written: patient policy `copay_percent` 20, `copay_cap_sar` 500; a 3000 SAR scan; the provider decides `approve_partial` with `copay_percent` 20. Expected copay 500 (the cap); the code computes 600.

Related: `GET /bookings/quote` (`insurance-engine.module.ts:224-247`) returns allowed methods only; it has no copay or cap estimate, so the patient sees no estimate before booking. That is a P2: the estimate is missing, not wrong.
