# PR-C — دليل الدفع المقيد واحتواء التسليم/التسوية

| السطح | الحالة |
|---|---|
| confirm/preparing/ready/out-for-delivery | يعيد فحص selected offer/allocation/version/quote. cash/card يحتاج `pharmacy_payment_evidence` مطابقاً لـorder+offer+version+snapshot hash+amount+currency+payer، وبـgateway payment وwebhook event مثبتين. |
| `payment_status=paid` و`moyasar_payments` العام | غير كافيين ومزالان من بوابة fulfillment. |
| COD | لا يزال يحتاج policy خادمية للتجهيز؛ لا يوجد collection proof حاكم. |
| `POST .../delivered` | **503 `delivery_settlement_reconciliation_required`** قبل تغيير الحالة. أزيل منطق earning/ledger غير المسوّى حتى لا يدعي التسليم أو الرصيد. |

## سبب الاحتواء

لا يوجد في المصدر بعد command موثق لـCOD collection proof منفصل، أو ledger business-key transaction، أو settlement-pending/reconciliation/DLQ dispatcher. لذلك منع PR-C التسليم والأرباح بدلاً من success محلي أو side effect صامت. لا يعني هذا إكمال تسوية مالية؛ إنه surface unavailable صريح حتى يوافق المالك على عقد وتسوية منفصلين.

## الاختبار المحلي

`npx jest src/modules/pharmacy/tests/pharmacy-allocation.payment-gate.spec.ts --runInBand` نجح بـ3 اختبارات: رفض paid flag العام، قبول دليل مطابق فقط، وفشل delivered قبل transition. كما نجح `npm run build`. لا PSP/webhook/Mongo transaction/Redis أو E2E منفذ.
