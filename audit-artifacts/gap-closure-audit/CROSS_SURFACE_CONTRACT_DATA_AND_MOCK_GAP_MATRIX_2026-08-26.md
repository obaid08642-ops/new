# Cross-surface contract, data-truth, and mock gap matrix

## الغرض

هذه المصفوفة ليست reconciliation ادعائية للـbaseline. هي Definition of Evidence للـgap-closure audit والتنفيذ اللاحق. لا يغلق أي صف UI/Provider/Admin حتى يثبت كل عنصر ذي صلة به بمسار source وسطر وعقد API وحالة خادمية واختبار مناسب.

## القواعد المشتركة غير القابلة للتجاوز

| التحكم | المطلوب |
|---|---|
| Auth/session | cookie/session أو mobile credential policy موثقة، expiry/refresh/revoke/device/OTP abuse controls؛ لا token أو secret في URL/log/UI |
| Ownership/RBAC | unauth 401؛ owner/stranger 404 حيث يلزم؛ wrong-role/tenant 403 أو 404 وفق contract؛ server enforcement لا UI hidden-button فقط |
| Data truth | price/stock/offer/ETA/insurance/co-pay/payment/result/status من server-authoritative source؛ لا totals أو approval أو availability محلية |
| State transitions | server transitions فقط مع actor policy، optimistic concurrency/locking، idempotency-key للـmutations الحساسة |
| Financial integrity | intent/webhook/ledger/reconciliation/refund/dispute؛ لا success screen قبل source-of-truth confirmation |
| PHI/PII | minimal screen data، consent/delegation، redacted logs، scoped attachments، retention/export/deletion policy |
| Mock/placeholder | كل signal production-path يصنف test-only/legitimate-copy/remove/real-contract؛ لا يتم إخفاؤه أو الإبقاء عليه بلا disposition |

## Pharmacy contract checklist

| خطوة | Patient Mobile/Web | Provider Pharmacy | Admin | Backend/Data proof المطلوب |
|---|---|---|---|---|
| Cart | line ID, quantity, Rx/custom item validation | لا وصول قبل broadcast | catalog/rules controls | server cart line validation + price not final |
| Submit | request payload, address/geo consent, idempotency | eligibility not visible yet | broadcast monitoring | order request state + geo/coverage eligibility |
| Broadcast | waiting/timeout/retry/empty | eligible pharmacies only receive request | operations exceptions | scoped broadcast event/queue; geo and tenant enforcement |
| Offer | display per-line availability, substitute, price, ETA, expiry | quote per line, stock reservation policy, expiry | moderation/audit | immutable offer/quote version; stock/price server calculated |
| Select offer | exactly one offer, clear totals and policy | selected/rejected outcome | audit | atomic selected offer / rejected competing offers / lock |
| Cash/Card | payment screen after offer selection only | prep after confirmation | reconciliation | payment intent/webhook/ledger; no client total |
| COD | patient informed deferred collection policy | collection/delivery evidence | COD policy/reconciliation | explicit COD state; no false paid state |
| Insurance | no payment before pharmacy decision | full/partial/reject + reference + co-pay | insurance audit/escalation | decision source, expiry, policy version, co-pay ledger |
| Co-pay | patient pays only after decision; cancel/change-to-cash choice | fulfillment after required payment/policy | reconciliation | co-pay intent/webhook and state transition |
| Fulfillment | tracking/cancel/refund/support | preparation/substitution/delivery proof | exception/dispute | immutable event history/outbox/notification |

## Consultation, Labs, Radiology, Home-care/Nursing checklist

| خطوة | Patient Mobile/Web | Provider | Admin | Backend/Data proof المطلوب |
|---|---|---|---|---|
| Discover/select | service/provider/facility eligibility | availability management | catalog/provider governance | canonical service/provider IDs, policy visibility |
| Slot/visit request | timezone, availability, address/consent as applicable | slot/visit ownership | ops exceptions | slot lock / capacity / duplicate prevention |
| Cash/Card | selection + price then payment before confirmation | no service commitment until confirmed | reconciliation | intent/webhook/ledger and exact status transition |
| Insurance request | submit without payment | full/partial/reject/co-pay decision | approval oversight | decision actor/reference/expiry/policy version |
| Co-pay | display exact approved patient responsibility | confirmation after payment/policy | financial review | co-pay payment and atomic confirmation |
| Execute | appointment/call/sample/scan/visit state | check-in/clinical/field result | SLA/escalation | actor-authorized state transition + audit |
| Results/reports | patient-owner result/report only | signed/authorized result creation | audit/correction workflow | source/author/time/version/correction/retention |
| Cancel/refund | policy accurate, no false refund success | provider cancellation constraints | maker-checker if financial | idempotent refund/dispute workflow |

## Family, health, prescriptions, chat, support

| المجال | proof المطلوب |
|---|---|
| Family/delegation | invite/accept/revoke/expiry, per-scope consent, dependent protection, 404/role enforcement |
| Health/clinical | ranges/units/provenance/correction, clinician disclaimer/escalation where needed, no unreviewed AI medical claim |
| Prescription | patient/provider ownership, status/version, refill authorization, attachment scanning/access expiry |
| Chat/call | conversation membership, message/media access, report/abuse controls, token/room TTL, no cross-tenant leak |
| Support | ticket ownership, safe attachment/log redaction, escalation/audit/SLA, no PHI disclosure to unscoped staff |

## Evidence required to change a gap disposition

| disposition | الحد الأدنى |
|---|---|
| `CONFIRMED_DEFECT` | exact source path/line + precise behavior + affected actor/journey + accepted fix/test |
| `STATIC_MATCHED_PARTIAL` | exact UI CTA → method/path/event → controller/service/DTO/state anchors؛ payment/insurance/ownership fields where applicable |
| `RUNTIME_REQUIRED` | static anchors موجودة لكن dependency/test evidence needed؛ specify sandbox/device/external system |
| `INSUFFICIENT_EVIDENCE` | exact missing proof, not a claim that feature is missing |
| `MISSING_CAPABILITY` | exact source evidence that no endpoint/state/CTA exists for required behavior |

## Review order

1. identity/ownership/security boundaries;
2. pharmacy offers/Cash/COD/insurance;
3. consultations Cash/insurance;
4. labs/radiology/home-care/nursing;
5. results/PHI/family/prescription/chat/support;
6. provider and admin controls for every prior slice;
7. mocks/placeholders and visual parity closure.

No row may progress to build merely because a screen exists or a UI button renders.
