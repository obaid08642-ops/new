# PR-B — قرار التأمين بواسطة الصيدلية المختارة

**الحالة:** **NO-MERGE / NO-DEPLOY**. لا PSP أو webhook أو بيانات حية أو migration منفذ.

| الجذر | العقد المنفذ |
|---|---|
| `POST /provider/pharmacy/orders/:id/insurance-decision` | الصيدلية المختارة فقط تسجل القرار. يتطلب account `pharmacy` بحالة approved/active، وorder↔selected offer/version↔selected allocation↔same pharmacy. |
| `PharmacyInsuranceDecisionService.decide` | transaction واحدة لقرار per-item المحسوب خادمياً وaudit وoutbox. لا يقبل client money أو outcome إجمالي كسلطة. `E11000` outbox هو replay idempotent موثق فقط. |
| legacy routes | `POST /provider/pharmacy/allocations/:id/insurance` يبقى 503؛ ومسار admin القرار أصبح 503 لأن admin ليس actor التجاري. |
| patient lifecycle | `POST /patient/pharmacy/orders/:id/insurance-rejection/cancel` يلغي قراراً مرفوضاً فقط بمفتاح idempotency، يحرر inventory المحجوز ويغلق allocation/order داخل transaction. |

## جدول القرار

| derived result | حالة order | التنفيذ |
|---|---|---|
| تغطية كاملة | `confirmed` | يسمح لبوابات fulfillment اللاحقة فقط. |
| تغطية جزئية | `waiting_copay` | لا confirmation/preparation حتى payment evidence للحصة. |
| رفض كامل | `manual_review` | لا تجهيز أو تسليم؛ يملك المريض مسار cancel المحكوم. |

## الأدلة

`npx jest src/modules/pharmacy/tests/pharmacy-insurance-decision.service.spec.ts --runInBand` نجح بـ5 اختبارات: الصيدلية المختارة، الأرقام المزورة، partial copay، provider غير مفعل/تخصيص أجنبي، no-op claim، E11000، وإلغاء المريض. `npm run build` ناجح.

## حدود صريحة

لا يملك نموذج `ProviderAccount` في المصدر حقلاً مستقلاً للـtenant/facility؛ ولذلك يطبق هذا PR account/resource relation المباشرة ولا يدعي tenant isolation غير موجودة. أي إضافة tenant/facility تحتاج schema + migration + backfill معتمدين. كما أن اختيار cash re-quote بعد الرفض غير منفذ؛ السطح المتاح هو cancel المقيد فقط. لم تختبر Mongo transaction حقيقية أو PSP/webhook/payment أو storage/device/E2E.
