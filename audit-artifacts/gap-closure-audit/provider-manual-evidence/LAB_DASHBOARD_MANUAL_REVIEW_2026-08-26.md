# Provider LabDashboard: manual semantic review

## Scope

تمت قراءة `src/screens/lab/LabDashboard.tsx` كاملًا، lines 1–1611، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. الواجهة تحتوي requests لبعض inbox/sample operations، لكن لا يثبت ذلك صحة controller/service/state/RBAC/PHI/insurance/ledger من الواجهة وحدها.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-LAB-001 | 34–42, 627–695 | stage enum يعتمد uppercase (`SAMPLE_COLLECTED`, `PROCESSING`) بينما أزرار العمل تختبر lowercase (`received`, `analyzing`, `result_ready`) وتكتب `analyzing` | توحيد canonical sample state machine في server/client مع transition validation/audit; الوضع الحالي يمكنه إخفاء CTA أو إرسال transition غير صالح |
| P-LAB-002 | 49–128, 213–338 | inbox/home لديه read shell، لكن Lab Home يعطي fallback patient/test/total/date قيمًا افتراضية عند نقص الحقول ويعرض `rad_home` غير مسجل في navigator | schema validation and truthful incomplete-data state; remove dead radiology navigation |
| P-LAB-003 | 371–449, 493–579 | reject/cash-confirm/NPHIES/assign/reschedule/register-sample ترسل state وnote/free-text مباشرة؛ الفني يكتب ID حرًا ولا توجد availability/ownership/idempotency/chain-of-custody evidence | server-authoritative booking, payment/insurance, technician eligibility, appointment lock and accession/chain-of-custody contract |
| P-LAB-004 | 379–405, 556–563 | provider writes NPHIES approval code and co-pay into a generic booking note/state and cash order is confirmed without payment evidence | insurer decision/reference and co-pay payment ledger/notification must precede confirmation; cash/card-before-confirmation rule must be enforced server-side |
| P-LAB-005 | 451–485 | fasting warning derives from static client `LAB_TESTS`, not authoritative ordered service/clinical instruction | ordered-test metadata and clinical rules must be server versioned, patient-specific and immutable for the booking |
| P-LAB-006 | 706–864 | result entry is hardcoded CBC parameters/reference ranges, lets technician edit ranges, uploads literal filename `lab_report_signature.pdf`, local draft only, and publishes generic stage without results payload | test-specific LIMS schema/reference intervals by patient/sex/age/instrument, actual file storage/scanning, attributed technician/supervisor double verification, critical-value escalation and immutable result/audit contract |
| P-LAB-007 | 837–860 | sample rejection allows a fixed local reason, then claims free recollection and patient notification | server decision, recollection entitlement/payment/refund policy, notification and chain-of-custody transition required |
| P-LAB-008 | 869–934 | result review always sends fixed `RESULTS` dataset, unrelated to entered values/sample | confirmed clinical data integrity defect: load saved sample results, do not publish fabricated CBC values; recipient permissions and notification/report release must be server-controlled |
| P-LAB-009 | 940–1022 | bundle activation/create are toast-only; custom-test approval sends provider-controlled price/reference data but no validation/test methodology evidence | catalog governance with laboratory accreditation/method/reference review, effective dates, payer/price controls and audit |
| P-LAB-010 | 1027–1154 | home collection uses three hardcoded collectors and synthetic decrementing ETA/distance, posts artificial GPS, and sets arrival state locally | real eligible phlebotomist dispatch, consented device location, assignment lock, truthful tracking, no-show/reassign policy and auditable state |
| P-LAB-011 | 1159–1228 | QR sample label is a decorative icon with print/save toasts; TAT tracker is a static dataset | signed printable barcode/label and real LIMS timestamps/metrics; no fabricated operational quality KPI |
| P-LAB-012 | 1233–1362 | insurance processing lets lab actor edit covered items, rejection reasons, cash prices and total co-pay locally before PATCH | insurer-authoritative full/partial/reject decision, coverage detail, cash conversion informed patient choice, co-pay ledger and patient notification state required |
| P-LAB-013 | 1367–1431 | lab name/status are static and imported Shared/Blueprint screens expose adjacent unsupported marketing/config/account functions | use authenticated lab profile/status and disposition imported demo/placeholder routes before production exposure |
| P-LAB-014 | 1436–1463 | ResultsList is permanently bound to `data={[]}` | connect authenticated result queue or show honest unavailable/empty state; otherwise result workflow is unreachable from this surface |
| P-LAB-015 | 1486–1611 | test-menu read is partial but add/edit price uses generic approval request; no effective-date, insurance impact, patient booking impact or approval-state view | approved catalog/pricing workflow with rate-plan propagation, active booking rules, audit and manager authorization |

## Cross-journey conclusion

Lab operations include partial API shells but the clinical result path is not safe: it can derive tests/ranges locally, upload a fake filename, and publish fixed results unrelated to sample input. Home collection is simulated. Insurance/co-pay is actor-entered without an insurer/ledger contract. Therefore the lab route is a confirmed production blocker until the listed state/data/security closures are built and independently verified.
