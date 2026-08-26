# Provider PharmacyDashboard: manual semantic review

## scope

تمت قراءة `src/screens/pharmacy/PharmacyDashboard.tsx` كاملًا، 1–1756، من archive baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. يحتوي الملف عدة شاشات/flows؛ وجودها داخل ملف واحد لا يعني أن عقدها أو سيناريوها مكتملان.

## confirmed defects against the owner-approved pharmacy journey

| ID | evidence | finding | impact | required correction |
|---|---|---|---|---|
| P-PHARM-001 | lines 254–270 و1404–1414 | CTA `Accept Order` يستدعي `/provider/pharmacy/orders/{id}/accept` مباشرة من broadcast، قبل إدخال عرض per-line availability/substitute/price/ETA | يخالف رحلة الصيدلية المعتمدة: broadcast يجب أن ينتج offers متعددة يختار المريض واحدًا منها؛ يمكن أن يحجز أول accept الطلب ويحرم المريض من المقارنة والاختيار | replace direct accept with draft quote → server validated quote/expiry → patient offer selection → selected allocation only |
| P-PHARM-002 | lines 1158–1175 | عند عدم العثور على allocation يخص `orderId`، يستعمل `rows[0]` كبديل | قد يعرض أو يعدل سلة allocation لطلب آخر؛ لا يجوز fallback cross-order في workflow مالي/صيدلي | return not-found/error state؛ server lookup by exact allocation/order ID with ownership enforcement; never substitute first row |
| P-PHARM-003 | lines 1345–1374 | Smart barcode screen ظاهرة لكن زرها disabled ويعلن scanner unavailable، من دون camera/barcode integration | capability معروضة لكن لا تستطيع تنفيذ inventory/packing/dispensing use case | implement authorized camera/barcode workflow or remove/feature-flag screen; validate barcode server-side and preserve audit trail |
| P-PHARM-004 | lines 547–550 ثم 630–642 | واجهة Voice procurement تسمح بالبدء/الإرسال، لكن `submitB2B('voice')` ينهي المسار برسالة unavailable | CTA يفتح تجربة ناقصة/متناقضة؛ ليس workflow فعليًا | implement voice capture/transcription/consent/upload or disable/remove tab until available |

## contract and security gaps requiring backend confirmation

| ID | evidence | observation | classification | closure evidence |
|---|---|---|---|---|
| P-PHARM-005 | 216–240 | Live Radar يوصف بأنه simulated WebSocket لكنه polling كل 5s على broadcasts، ويبتلع الأخطاء في 234 | runtime/contract required؛ ليس defect لمجرد polling | prove provider eligibility, geo/tenant scope, pagination/cursor, visibility expiry, reconnect/error UI, token/role enforcement and event/outbox policy |
| P-PHARM-006 | 1209–1244 | UI يجمع policy/auth/co-pay ويرسل `status: 'APPROVED'` من العميل ثم يغير local state | static risk: client-provided insurance approval decision must not be authoritative | backend must derive/validate decision actor, policy reference, status set, co-pay, expiry; UI must support full/partial/reject not forced APPROVED |
| P-PHARM-007 | 1226–1235 و1237–1244 | substitute name/price/availability تعدل محليًا ثم ترسل basket | partial implementation only | quote version, inventory reservation, substitute consent, price/ETA, offer expiry, server-calculated totals, patient selection required |
| P-PHARM-008 | 416–424 و475–490 | prescription UI locally derives covered/cash values from `item.price`, `qty`, `isCovered` | source-of-truth unproven for totals/coverage | return server-authoritative payable/covered/co-pay breakdown; no local financial decision |
| P-PHARM-009 | mutations at 256,275,405,575,794,1025,1046,1215,1239,1518,1645,1721 | visible client calls carry no idempotency key at source level | contract/runtime required; interceptor may exist, but cannot be assumed | prove mutation idempotency coverage/replay behavior or add typed mutation client and tests |
| P-PHARM-010 | 999–1054 | dispatch/delivered accepts client supplied driver identity and phone; delivery proof/COD collection not visible in this screen | contract/security required | allocation ownership, driver identity, delivery proof, recipient verification, COD state/collection, immutable status audit and retry idempotency |
| P-PHARM-011 | 1618–1653 | chat uses order threads/messages endpoints but no static evidence of membership/attachment/PHI policy | contract/runtime required | server membership/role/tenant enforcement, media scan/access policy, audit/retention and stranger negative tests |

## positive static evidence, not a closure claim

The file has real-looking client calls and loading/error/empty states in several paths, including prescription retrieval, wallet, returns, dispatch, inventory and chat. These do not establish that routes exist, are secure, or meet the canonical journey. They should be retained as anchors for contract review rather than treated as completed functionality.

## required Provider Pharmacy completion map

The provider must receive scoped broadcasts, construct per-line quotes, record availability/substitutes/price/ETA and offer expiry, submit an offer without winning the order, then act only after the patient selects that offer. Cash/card follows selected offer payment confirmation; COD follows explicit deferred-collection policy; insurance follows pharmacy decision full/partial/reject then co-pay and confirmation. Each transition must be server-authorized, idempotent, auditable, and visible to patient/admin surfaces.
