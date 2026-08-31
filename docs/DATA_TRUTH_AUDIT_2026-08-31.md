# Phase A — تدقيق حقيقة البيانات (2026-08-31)
منهجية: مطابقة كل استدعاء API في patient-app (121 مساراً) مع كل endpoint في backend (719 مساراً، global prefix = `api`)، مع وعي بـ api/v1 والمسارات الديناميكية واستبعاد ملفات الاختبار.

## النتيجة: 23 استدعاء يتيم (frontend ينادي endpoint غير موجود في الباكند)
| المجال | الاستدعاءات اليتيمة | الشاشات المتأثرة | الحسم المطلوب |
|---|---|---|---|
| nursing/home-care | /home-care/bookings, /home-care/bookings/my, /home-care/packages, /home-care/services | (tabs)/nursing, nurse-profile, orders | عالي — رحلة التمريض المنزلي تنادي endpoints غير موجودة |
| insurance | /insurance/claims, claims/my, claims/submit, benefits-summary, ocr-extract, requests/my, save-policy | hub, claim-tracking, submit-claim, add-policy, approval-pending | عالي — رحلة المطالبات التأمينية معلّقة |
| pharmacy | /patient/pharmacy/orders | checkout, manual-order, order-history | حرج — إتمام شراء الصيدلية قد يفشل |
| reviews | /patient-ux/review | post-call-rating, reviews | متوسط — التقييمات لا تُرسل |
| articles | /articles/bookmarks/mine, /articles/categories | bookmarks, index | متوسط |
| chat/family | /chat/threads/direct, /family/chat/messages | chat-with-doctor, family/chat | متوسط |
| health | /health/medications, /wearables/data, /wearables/devices | drug-scanner, wearables | متوسط |
| ai | /ai/drug-interactions | drug-scanner | منخفض |
| misc | /push/register, /refunds/my | notifications utils, refund-status | منخفض |

## حقائق مؤكدة
- health: 6 controllers موجودة — المجال حقيقي (الأيتام محصورة في wearables/medications الفرعية).
- nutrition (2 controllers, 0 أيتام) و maternity (2 controllers, 0 أيتام): سليمة ومربوطة.
- payments: paymob.controller موجود؛ شاشات success/failed تقرأ من params فقط (مشروع لصفحات العرض)، processing تستعلم API فعلاً — الدمج المقترح (B5) يبقى تحسيناً لا إصلاحاً حرجاً.
- الأيتام الثلاثة في src/utils/api.security.test.ts مستبعدة (اختبارات مقصودة).

## القرار
هذه الـ 23 فجوة تُحسم إما ببناء الـ endpoints الناقصة في الباكند (الأولوية: pharmacy orders + insurance claims + home-care) أو بتصحيح مسار الاستدعاء إذا كان الاسم مختلفاً فقط — قبل أي توسعة ويب، لأن الويب سيرث نفس العقود.
