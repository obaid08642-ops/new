# Insurance copay cap: P1 (reproduced at runtime 2026-10-29)

Scenario: D-04 (book with insurance, copay and cap estimate). Found while reading the insurance path on 2026-10-29, and reproduced at runtime the same day by `tools/live/j_qa_copay_cap.py` (kept out of the gate, `tools/live/gate_skip.txt`).

| ID | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| INS-CAP-1 | P1 | The patient's copay cap from the insurance card is not applied to insurance requests. The copay is `price × provider percent ÷ 100`, with no cap. | `backend/src/modules/insurance-engine/insurance-engine.module.ts:643-653` (decide: `approve_partial`, copay from `copay_percent` or `copay_amount` only). The cap is stored on the patient's policy (`backend/src/schemas/patient-profile.schema.ts:102`, `backend/src/modules/insurance/insurance.dto.ts:9`), and read only by pharmacy ordering (`backend/src/modules/ordering/ordering.service.ts:39`). | Apply `min(copay, copay_cap_sar)` in the insurance decide path, as ordering does. |

Runtime result (local stack, 2026-10-29): patient card copay 20 %, cap 500 SAR; an 850 SAR scan; the centre decides `approve_partial` with `copay_percent` 70. Expected copay 500 (the cap). Actual: `GET /insurance/requests/:id/capabilities` amount 595 and the stored `copay_amount` 595 (70 % of 850). The cap is ignored.

Related: `GET /bookings/quote` (`insurance-engine.module.ts:224-247`) returns allowed methods only; it has no copay or cap estimate, so the patient sees no estimate before booking. That is a P2: the estimate is missing, not wrong.
