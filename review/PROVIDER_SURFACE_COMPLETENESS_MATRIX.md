# مصفوفة اكتمال أسطح مزوّد الخدمة — جرد أولي

**الحكم:** لا قطاع أدناه موصوف بأنه production-ready. أي surface بلا عقد ownership/payment/clinical/audit كامل يجب أن يبقى unavailable أو يعالج في remediation card منفصلة.

| القطاع | دليل surface في المصدر | ما هو مثبت | فجوة مانعة | الحالة المطلوبة |
|---|---|---|---|---|
| الصيدلية | `PharmacyDashboard.tsx`؛ `PharmacyBroadcastService`؛ allocation/offer services | broadcast DTO محدود، offer preview، اختيار صريح، بوابات الدفع/التأمين الحالية | تسليم/COD collection/settlement، tenant model، integration حي | delivery غير متاح صراحة؛ لا readiness. |
| الطبيب/الاستشارات | `ProviderHome.tsx` وواجهات calls | surface اتصال فقط | لا دليل كامل slot/capacity/payment/insurance/EHR/video audit | unavailable مع remediation card. |
| المختبر | `LabDashboard` ومسارات `lab` | استدعاءات UI مصدرية | لا دليل chain-of-custody/private storage/consent/payment gate كامل | unavailable مع remediation card. |
| الأشعة | `RadiologyDashboard.tsx` يستدعي coverage/report/catalog | UI routes موجودة | report approval وpricing/coverage UI لا يكفيان لإثبات authority/consent/storage | unavailable مع remediation card. |
| التمريض/الرعاية | شاشات home-care/nursing | surface فقط | visit/location/signature/payment authority غير مثبت | unavailable مع remediation card. |
| الإسعاف | شاشات/routes emergency | احتواء سابق محدود | لا dispatch/mission/location authority كامل | unavailable مع remediation card. |
| onboarding/facility/availability | `src/api/provider.ts` وprovider settings | submit/delta routes مصدرية | KYC/storage/moderation/facility authority غير مثبتة end-to-end | unavailable مع remediation card. |
| payout/earnings | pharmacy/provider payout surfaces | لا earning جديد من delivered المقفل | reconciliation/settled ledger/bank lifecycle غير مكتمل | unavailable مع remediation card. |

> هذه مصفوفة evidence-led وليست شهادة إكمال. يلزم استكمال تحويل CTAs غير الحاكمة إلى unavailable واختبار كل route قبل اعتبار PR-E منتهياً.
