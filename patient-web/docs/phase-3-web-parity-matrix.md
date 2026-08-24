# مصفوفة تكافؤ Web App المريض — نبض بلس

**قاعدة الحالة:** لا تعني كلمة «مطلوب» أن واجهة شكلية ستنشأ. لا ينتقل أي نطاق إلى «منفذ» إلا بعد ربط العقد الحقيقي، وحالات التحميل والفراغ والخطأ والرفض، واختبارات الوحدة والتكامل والمسار النهائي.  
**النطاق:** Web App المريض فقط. لا يشمل تحويل Admin أو Provider إلى الويب.

| عائلة المصدر | معادل Web App للمريض | عقد/بيانات الإثبات | قرار الاكتشاف | الحالة | معيار الإغلاق |
|---|---|---|---|---|---|
| الهوية والجلسة | welcome، تسجيل/دخول، OTP، reset، onboarding، route guards، انتهاء/تجديد | auth + `SessionManager` + JWT guards | خاص `noindex` | مخطط | auth mode مؤكد وOTP/refresh/revoke واختبارات rejection. |
| shell والتنقل | header، desktop nav، mobile nav، language/theme، notifications | root/tab layouts + users/settings | خاص `noindex` | مخطط | كل رابط له escape route وحالة auth/role سليمة وRTL/LTR. |
| ملف المريض | profile، photo، addresses، privacy/security/notifications/sessions | `users/me/*` + addresses | خاص `noindex` | مخطط | fetch/update/logout/revoke حقيقة، لا cache حساس غير محمي. |
| الملف الطبي | diseases/allergies/surgeries/long-term meds/health passport | `medical-profile` | خاص `noindex` | مخطط | كل mutation محمي ومتحقق خادمياً، QR قصير الأجل خارج URL. |
| الصحة والتذكيرات | vitals/sleep/trends/score/reports/prescriptions/reminders/refills/contacts | `health/*` | خاص `noindex` | مخطط | real error/empty states، event timestamps واضحة، قناة reminder ويب مثبتة. |
| العائلة | group/invite/join/members/permissions/calendar/member health | `family/*` + `NoGuestsGuard` | خاص `noindex` | مخطط | role boundary يختبر server-side، reject/pending/approved scenarios كلها مرئية. |
| الصيدلية | catalog/search/filters/detail/compare/scanner/wishlist/cart/Rx/upload/orders/tracking/reorder/returns | medicines/cart/prescriptions/orders/returns | عام فقط للمنتج المنشور؛ المعاملة خاص | مخطط | prices/Rx/availability من response، checkout وتتبع بملكية مريض حقيقية. |
| الاستشارات | discovery، doctor/facility details، slots، booking، waitlist، cancel/reschedule/check-in/summary | `care/*` + appointments | public entity eligibility only؛ الحجز خاص | مخطط | slot-lock/cancel/reschedule/errors/roles/E2E حقيقية؛ realtime لاحقاً بشروطه. |
| المختبر والأشعة | catalog/packages/tests/booking/documents/insurance/results/tracking | labs/radiology controllers | catalog عام مؤهل؛ النتائج خاصة | مخطط | filters server-side، route الوثائق والنتائج protected/noindex. |
| الرعاية المنزلية والتمريض | service/provider detail، booking، tracking | `home-care/*` بعد المطابقة | public service eligibility only؛ booking خاص | مخطط | لا مزود وهمي ولا real-time ظاهر حتى token/event مثبت. |
| التأمين | policy/companies/network/benefits/coverage/claims/approvals/payment split/refunds | insurance controllers/API doc مطلوب | خاص `noindex` | مخطط | companies/plans/live coverage response حقيقية؛ لا قوائم تأمين ثابتة. |
| الدفع والمحفظة | payment status/cards/transactions/topup/transfer | wallet/payment contracts/API doc مطلوب | خاص `noindex` | مخطط | tokenization/3DS/webhook boundaries مثبتة؛ لا أرقام بطاقات أو success simulation. |
| التقارير والوثائق | list/timeline/view/download/AI analysis/passport | medical reports/storage contracts | خاص `noindex` | مخطط | authorization owner-check، signed URLs، audit trail، لا file bytes في DB/UI state. |
| المكالمات والمحادثة | doctor/family chat، waiting room، video/voice/call history | Socket/LiveKit contracts/API doc مطلوب | خاص `noindex` | مخطط | room token + authz + reconnect + unavailable/denied/ended states. |
| AI الصحي | triage/symptom/skin/Rx OCR/translate/monthly report | ai endpoints/consent requirements | خاص `noindex` | مخطط | input consent، refusal/error/scoping، عدم الادعاء بالتشخيص، audit/error path. |
| الصحة النفسية والتغذية والأمومة | tracker/journal/crisis/nutrition/pregnancy | mental/nutrition/maternity contracts | خاص `noindex` | مخطط | حساسية البيانات وضوابط العرض، crisis route آمن، لا نصائح متخيلة. |
| الدعم/المجتمع/الولاء/الإحالات | feedback/tickets/community/reviews/rewards/referrals | support/community/loyalty/referrals | public CMS فقط إن نشر؛ account خاص | مخطط | UGC أصلي فقط، moderation/empty/error، لا reviews مصطنعة. |
| المحتوى العام والاكتشاف | articles + published provider/facility/service/medicine pages | articles + SEO resolver + publish status | عام فقط بعد eligibility | مخطط | SSR/metadata/JSON-LD/sitemap/hreflang/canonical، منع جميع routes الخاصة. |

## حالات موحدة إلزامية لكل route

كل مسار خاص أو عام سيحمل تمييزاً عملياً بين: `loading`، `ready`، `empty`، `recoverable error`، `offline/cached if supported`، `unauthorized`، `forbidden`، `not found`، و`mutation pending/success/failure`. لا يستخدم `catch` صامت، قائمة صفرية بدلاً من error، أو redirect إلى معرف افتراضي.

## تكافؤ لا يعني تطابق واجهة

قد تختلف بنية سطح المكتب عن الهاتف في الجدول أو اللوحة أو responsive drawer، لكن تدفق القرار، التفويض، صحة البيانات، ومآل كل زر يجب أن تبقى مكافئة أو أفضل. الإمكانات الجوالية الأصلية لا تنسخ اسماً فقط: تستبدل بـbrowser capability مثبتة أو توثق كحد منتج/خلفية.
