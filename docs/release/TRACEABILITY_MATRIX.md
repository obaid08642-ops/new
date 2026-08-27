# مصفوفة التتبع — Patient Production

تربط هذه المصفوفة كل متطلب تجاري بعقد المجال والسطح البرمجي والاختبار وPull Request. تضاف الأسطر مع التنفيذ؛ ولا يعد المتطلب مغلقاً قبل امتلاء أعمدة الاختبار وPR والدليل.

| المعرف | المتطلب | العقد أو الحالة | أسطح التنفيذ | اختبار القبول | PR / الدليل | الحالة |
|---|---|---|---|---|---|---|
| REL-001 | مسار إصدار محمي ومراجعة قبل `main`. | Branch protection وrequired reviews. | GitHub branches وworkflows. | محاولة دفع مباشرة مرفوضة؛ PR يتطلب مراجعة. | يملأ عند تنفيذ CI. | In progress |
| PAY-001 | إزالة المحفظة. | لا `wallet` في PaymentMethod أو transition. | Backend، Web، Mobile، tests. | بحث policy + contract tests + routes/screens absence. | يملأ عند التنفيذ. | Planned |
| PAY-002/3 | دفع إلكتروني موثق. | `PAYMENT_PENDING` → `CONFIRMED` عبر webhook فقط. | Payment API، BFF، webhook، checkout. | توقيع خاطئ، مبلغ خاطئ، حدث مكرر، نجاح صحيح. | يملأ عند التنفيذ. | Planned |
| PAY-004 | نقاط بحد 5%. | `points_discount_minor` في quotation. | Pricing service وcheckout وreceipt. | نقاط كافية/ناقصة، rounding، حد 5%، reversal. | يملأ عند التنفيذ. | Planned |
| PH-001/2/3 | بث وعروض واختيار وتفاوض. | PH-PHARMACY. | Orders، offers، chat، UI. | no-offer، concurrent selection، expired revision، price tamper. | يملأ عند التنفيذ. | Planned |
| PH-004 | تأمين الصيدلية لكل بند. | insurance decision وco-pay states. | Provider action، Patient Web/Mobile. | full/partial/rejected/self-pay/cancel. | يملأ عند التنفيذ. | Planned |
| SRV-001/2 | حجوزات الخدمات النقدية والتأمينية. | PH-SERVICE. | consult/lab/radiology/nursing. | slot race، cash، coverage، co-pay، cancel/reschedule. | يملأ عند التنفيذ. | Planned |
| SEC-001 | حارس حالة وملكية وتكرار وتدقيق. | StateGuard وMoneyGuard. | كل mutation وwebhook. | BOLA/IDOR وretry وillegal transition. | يملأ عند التنفيذ. | Planned |
| WEB-001 | إكمال route manifest للويب. | allowed actions وtyped DTO. | Patient Web routes. | loading/empty/error/forbidden/success لكل route. | يملأ عند التنفيذ. | Planned |
