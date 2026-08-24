# NABD Main End-to-End Traceability — checkpoint

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

This checkpoint is an evidence map, not the final audit. It combines the raw backend route decorator index with consumer-side action references from the patient web, patient mobile, provider, and admin archives. Every scenario remains `UNVERIFIED` until the complete source file is semantically read and the screen → endpoint → service → schema/state → actor → payment/insurance → result path is proven.

## Evidence counts

| Evidence set | Count |
|---|---:|
| Extracted first-party archive members | 3,128 |
| Backend route/decorator evidence lines | 1,663 |
| Consumer action-reference lines | 3,536 |
| Files with action references | 485 |
| Candidate screen/page/navigation rows | 59 |

## Required service scenario matrix

| Service/scenario | Required trace | Current audit status | Evidence source |
|---|---|---|---|
| Pharmacy cash/card/insurance/Rx/no-Rx/delivery/pickup/offers/substitutes | patient request → pharmacy/provider quote → patient decision → insurance/payment → fulfillment/result | UNVERIFIED | backend route raw index + consumer action index |
| Consultations clinic/video/home | doctor/slot/channel → provider decision/quote/insurance → payment → appointment/call/result | UNVERIFIED | backend route raw index + web/mobile/provider indexes |
| Laboratory home/facility | service/provider/mode → acceptance → collection/QC → report publish | UNVERIFIED | backend route raw index + page/screen indexes |
| Radiology legacy/center | service/provider/mode → canonical booking → scan/report publish | UNVERIFIED; possible inconsistency requires source proof | backend route raw index |
| Nursing/home-care field operations | request/address/slot → provider assignment → transit/care → completion/report | UNVERIFIED | backend route raw index + mobile/provider indexes |
| Insurance full/partial/rejected/documents-required | request/quote → provider decision per item → patient decision → co-pay/eligible cash | UNVERIFIED | backend route raw index + consumer action index |
| Payment failure/cancel/retry/refund/result | server quote/decision → PSP intent → signed webhook → audit/fulfillment/refund | UNVERIFIED/BLOCKED until sandbox evidence | backend webhook/payment evidence pending semantic trace |

## Rules for final classification

No row may be classified `MISSING`, `PARTIAL`, `INCONSISTENT`, or `BROKEN` from this checkpoint alone. The final classification must cite a source path, line range, route or screen, and an existing or missing test after semantic reading. Presence of a route or action reference does not prove that the full journey is usable.
