# PR-1 — بوابات ما بعد اختيار العرض الصيدلي

**الفرع:** `remediation/provider-production-governed`  
**القرار:** مخصص للمراجعة فقط؛ لا دمج ولا نشر.

## الجذور المتأثرة

| الجذر | التغيير |
|---|---|
| `PharmacyOfferService.selectByPatient` | يكتب مرجع العرض وإصداره داخل allocation الذي أُنشئ بعد اختيار المريض. |
| `PharmacyAllocationService` | يرفض `confirm/preparing/ready/out-for-delivery/delivered` ما لم تتطابق علاقة order/allocation/selected offer/version ولقطة السعر، ثم يطلب دليل الدفع أو قرار التأمين/دفع المشاركة أو سياسة COD خادمية. |
| `PharmacyInsuranceDecisionService` | أمر إداري داخلي لقرار full/partial/rejected مربوط حصراً بالعرض المختار، وحصص محسوبة من بنود العرض، مع idempotency وسجل outbox intent. |
| `ProviderPharmacyController` | مسار `allocations/:id/insurance` القديم مغلق؛ القرار الجديد إداري تحت `admin/pharmacy/orders/:orderId/insurance-decision`. |
| ledger عند التسليم | لم يعد فشل إضافة القيد المالي يُبتلع بصمت؛ يظهر الفشل لاستدعاء الأمر كي تعاد معالجته بصورة واعية. |

## جدول انتقالات السلطة

| الدفع أو التأمين | الشرط قبل `CONFIRMED` أو ما بعده | النتيجة عند الغياب |
|---|---|---|
| cash/card | حالة order مدفوعة أو سجل `moyasar_payments` مدفوع للمبلغ المحدد في quote. | `payment_confirmation_required`. |
| COD | سياسة fulfillment خادمية فعالة تسمح بالتحضير لطريقة COD والصيدلية. | `cod_policy_confirmation_required`. |
| تأمين كامل | قرار داخلي موثق للعرض نفسه وإصدار نفسه، ومشاركة المريض صفر. | `insurance_decision_required` أو رفض قرار غير صحيح. |
| تأمين جزئي | قرار per-item وحصة مريض محسوبة خادمياً، ثم دفع موثق لحصة المريض. | `copay_payment_confirmation_required`. |
| تأمين مرفوض | لا تنفيذ؛ الطلب يدخل مراجعة يطلب cash re-quote/selection جديداً. | `insurance_requote_required`. |

## الاختبارات المحلية

| الأمر | النتيجة |
|---|---|
| `npx jest src/modules/pharmacy/tests/pharmacy-insurance-decision.service.spec.ts src/modules/pharmacy/tests/pharmacy-offer.service.spec.ts --runInBand` | 6 اختبارات ناجحة. |
| `npx jest src/modules/pharmacy/tests/pharmacy-allocation.payment-gate.spec.ts --runInBand` | اختباران ناجحان. |
| `npm run build` | ناجح. |

## حدود هذه الدفعة

هذه الدفعة لا تنفذ PSP أو webhook أو تسوية مالية خارجية ولا E2E أو قاعدة بيانات حية. الـoutbox intent مسجل للقرار الداخلي، لكنه لا يفعّل عامل إرسال أو retry/DLQ. تسليم allocation قد يكون مسجلاً قبل خطأ ledger؛ لا يوجد بعد transaction مشتركة بين الحالة والقيد، ولذلك يبقى على قائمة PR لاحق لتصميم reconciliation. لا يطلب هذا PR دمجاً أو نشرًا.
