# Nabdah Full Systematic QA & Workflow Validation Register

## Purpose and release rule

هذا السجل هو المرجع التنفيذي لجولة التدقيق الحالية. يغطي Patient App وProvider App وAdmin Dashboard وBackend/Database، ويعامل كل شاشة وزر ومسار كعقد يجب تتبعه من consumer إلى controller/service/schema ثم إلى حالة الواجهة. لا يُعلن اكتمال أي lifecycle إلا مع دليل حي أو اختبار مصدر مناسب. حسابات sandbox فقط، ولا تُنفذ عمليات مالية حقيقية أو حذف جماعي أو تفعيل لعقود consent/QR/emergency-location غير المعتمدة.

| Status | Meaning | Release interpretation |
|---|---|---|
| PASS | الاستجابة والحالة قبل/بعد والدليل متسقة | قابل للإغلاق بعد مراجعة الأثر |
| FAIL | عيب وظيفي أو أمني مثبت | إصلاح مصدرّي ثم build/test/deploy/revalidate |
| BLOCKED | يتطلب اعتماداً خارجياً أو gateway غير مفعّل أو عقداً fail-closed | لا يُحسب فشلاً برمجياً، ولا يسمح بإعلان إطلاق كامل |
| INCONCLUSIVE | timeout أو نقص دليل أو route غير محسوم | يبقى مفتوحاً ولا يتحول إلى PASS |
| SECURITY-PASS | رفض actor غير المالك 403/404 مع ثبات حالة الأصل | يغلق BOLA لذلك المسار فقط |

## Current evidence baseline

| Area | Evidence | Current result |
|---|---|---|
| Backend security remediation | production commit history and live Gatekeeper evidence | BOLA/role fixes largely confirmed; later regression must remain open until rechecked |
| Patient readonly baseline | `PATIENT_READONLY_LIVE_MATRIX_20260818.json` | login and several catalog/order/wallet reads passed; guessed profile/family/appointments/hospitals paths returned 404 and require exact contract mapping |
| Patient exact-read retry | `PATIENT_EXACT_READ_PROBE_20260818.md` | INCONCLUSIVE transport timeout; no functional conclusion |
| Provider route map | `PROVIDER_OPERATIONAL_ROUTE_CATALOG_20260818.md`, `PROVIDER_INTAKE_BACKEND_ROUTE_MAP_20260818.txt` | source contracts mapped; live provider reads limited by 404 classification and 429 windows |
| Provider readonly probe | `PROVIDER_READONLY_LIVE_MATRIX_20260818.json`, `PROVIDER_READONLY_FINDINGS_20260818.md` | no mutations performed; 404/429 require controlled retry and body classification |
| Patient consumer/backend map | `PATIENT_CONSUMER_BACKEND_ROUTE_MAP_20260818.txt` | 1450-line reconciliation artifact created |
| Provider screen inventory | `PROVIDER_SCREEN_CONTROLLER_INVENTORY_20260818.md` | 42 screen files and 5 API/context files inventoried |

## Lifecycle coverage matrix

| Domain | Patient initiation | Provider intake | Execution | Completion/reporting | Financial/notification/ownership checks | Current gate |
|---|---|---|---|---|---|---|
| Online consultation | directory → slot → booking | doctor inbox → accept/reject | chat/video → start/end/no-show | SOAP, prescription, lab/radiology referrals | payment gateway, ledger, notifications, patient2 BOLA | route map complete; live lifecycle open |
| Clinic consultation | facility/doctor → slot → confirmation | doctor/facility appointment inbox | check-in → consultation → end | medical report and follow-up | location/attendance/ownership | live lifecycle open |
| Home consultation | doctor service → address/time → booking | doctor queue → accept/reassign | arrival/start/end | report/prescription | GPS policy remains fail-closed; ownership | live lifecycle open |
| Pharmacy delivery | medicine/search → cart → checkout/order | broadcast/queue → accept → basket | preparing → ready → dispatch → delivered | reorder/refill and inventory before/after | payment blocked by Moyasar activation; BOLA/ledger | read contracts mapped; mutation lifecycle open |
| Pharmacy pickup | branch/product → pickup order | pharmacy intake and readiness | ready → pickup confirmation | completed/reorder | inventory and notification | contract/lifecycle open |
| Laboratory branch/home | service/package → slot/address → booking | lab inbox → accept/reassign | collected → analyzing → result | report/upload/access | insurance/cash/opt-in and BOLA | contract mapped; live lifecycle open |
| Radiology branch/home | service → slot/address → booking | radiology inbox → accept/reassign | performed → report/images | patient access | insurance/cash and BOLA | contract mapped; live lifecycle open |
| Nursing/home care | package → address/time → request | nurse queue → accept/reject | start/location/visit/end | completion/evaluation | GPS/push and ownership | live lifecycle open |
| Hospital/facility | hospital/branch/service → booking | hospital staff permissions and inbox | appointment status | discharge/report | hospital-admin vs provider isolation | source contract mapped; live read/mutation open |
| Shared identity | profile/family/settings | onboarding/KYC/bank/schedule | notifications/chat/reconnect | wallet/payout/history | cross-account reads and mutation BOLA | partial evidence; exact consumers open |

## Provider intake protocol

For each provider type—doctor, pharmacy, laboratory, radiology, nursing, hospital, and ambulance—the controlled order is: login once; read `/provider/auth/me`, `/provider/profile`, `/provider/me`, `/provider/dashboard/stats`, `/provider/dashboard/recent`, `/provider/availability`, `/provider/schedule`, `/provider/notifications`, and the type-specific inbox; record status and redacted body keys; only then create or use an existing sandbox request; perform one accept/reject/reassign transition; verify ownership and state before/after; execute the minimum completion action; verify report, notification, ledger, and patient visibility. Rate limits must expire before retry. No synthetic request may be seeded in production.

## Open blockers

| Blocker | Why it remains open | Required evidence |
|---|---|---|
| Moyasar live payment | gateway returns `Entity not activated to use live account`; application correctly returns `502 payment_gateway_unavailable` | owner activates commercial account, then sandbox payment/webhook/idempotency/refund test |
| Consent/QR/location/error-code contracts | owner legal/product approval is pending; contracts remain fail-closed | independent approval record plus technical Gatekeeper review |
| Provider 404/429 | 404 bodies were not retained by the initial matrix and 429 windows were active | one-account-at-a-time retry after window with body classification |
| Patient exact-read transport | origin probe timed out before response | stable origin probe with bounded curl output and evidence file |
| Device-level push/call/GPS | requires real phones and production permissions | owner checklist with screenshots/video/logs |

## Governance decision

المشروع لا يُصنّف جاهزاً للإطلاق الكامل لمجرد نجاح backend tests أو بعض probes. الحكم المرحلي الحالي هو **SOURCE REMEDIATION SUBSTANTIALLY COMPLETE / SYSTEMATIC QA OPEN**. يلزم إغلاق دورة حياة كل خدمة، والتحقق من Provider intake، وإعادة اختبار Patient exact contracts، ثم بناء/اختبار الحزم والتطبيقات والأجهزة قبل إعلان الجاهزية.

## Provider read-only wave — recorded 2026-08-18

Doctor, laboratory, radiology, pharmacy, nursing, and hospital sandbox provider logins each returned HTTP 201 in the controlled origin-direct wave. Progress, notifications, wallet balance, and wallet transactions returned HTTP 200 for each successful account. Laboratory and radiology inbox reads returned HTTP 200. Nursing visits returned HTTP 200. Pharmacy required route reconciliation: `/provider/pharmacy/broadcasts` is the controller-declared read route and returned HTTP 200; stale `/pharmacy/provider/*` guesses returned HTTP 404. Hospital `/hospital/staff` returned HTTP 403 for the ordinary hospital sandbox account and remains a least-privilege boundary pending a dedicated hospital-admin sandbox identity.

No provider queue, accept, reject, toggle, staff, visit, report, payment, or wallet mutation was executed in this wave. Empty read lists are not treated as lifecycle success; a real eligible sandbox request is required before mutation testing.

## Patient BOLA live wave — recorded 2026-08-18

A real order ID was selected from Patient-1 `/orders/mine`; no ID was fabricated. Patient-1 owner read before and after the foreign attempt returned HTTP 200 with identical body size. Patient-2 received HTTP 403 for the foreign order read and HTTP 403 for `POST /orders/:id/cancel`. No owner cancellation or other state-changing operation was performed. This closes the tested order-read/order-cancel BOLA case for the sandbox pair; other object families still require their own matrix.

A follow-up report-object BOLA check used the same real sandbox order. Owner PDF access returned HTTP 200 with a 1524-byte valid response; Patient-2 foreign PDF access returned HTTP 403 with a 71-byte error response. The PDF bodies were removed immediately and are not stored in the repository.

## Pharmacy lifecycle gate — recorded 2026-08-18

A real Patient-1 pending pharmacy order was inspected read-only. It carries a pharmacy assignment ID, but the pharmacy sandbox account has no started onboarding profile and its provider broadcast list is empty. The account cannot be safely assumed to own the order. Pharmacy accept/reject/dispatch was therefore **BLOCKED_NO_ELIGIBLE_PROVIDER_ASSIGNMENT**; no mutation was sent to an unmatched provider.

## Laboratory lifecycle gate — recorded 2026-08-18

The real lab provider inbox was inspected without mutation. The sanitized summary shows one request already in `REPORTED` state and a wrapper entry with no request status; there is no pending/accepted request suitable for accept, collection, analysis, or report-upload testing. The lab lifecycle remains **BLOCKED_NO_ELIGIBLE_PRE_REPORT_REQUEST** and the reported request was not altered.
