# Baseline Phase 0/1 — Nabd Plus

**مصدر baseline:** فرع الويب الحالي `agent/web-complete-v2-20260822`.

## حالة Git وقت التثبيت

الفرع والـHEAD والحالة يجب تسجيلها قبل كل تنفيذ. في الفحص الحالي، scan الأول توقف لأن `grep` وجد نتائج وأعاد exit code غير صفري، كما أن البحث دخل في ملفات build المجمعة. أُعيد الفحص باستثناء `node_modules` و`.next` والخرائط، لذلك لا تعتبر نتائج scan الأول فشلًا وظيفيًا.

## أرقام الويب الحالية

| القياس | القيمة |
|---|---:|
| ملفات صفحات `page.tsx` | مسجلة من filesystem في الفحص |
| API route files | مسجلة من filesystem في الفحص |
| ملفات اختبارات الويب | مسجلة من filesystem في الفحص |
| اختبارات Vitest السابقة المعتمدة | 142 ملفًا ناجحًا، 290 اختبارًا ناجحًا، 14 ملفًا و23 اختبارًا متخطاة |

## نتائج البحث الأمني الأولي

ظهرت كلمات `localStorage` و`Authorization` و`file://` و`content://` و`national_id` و`user_id` في مواضع مختلفة، لكن وجود الكلمة وحده ليس finding؛ يلزم تصنيف كل occurrence إلى source code أو test fixture أو BFF server-only أو سلوك فعلي. على سبيل المثال، `Authorization` موجود في upstream server wrapper لإرسال access token من الخادم، وtokens ظهرت أيضًا داخل fixtures لاختبارات منع التسريب. لا يجوز تحويل هذه النتائج آليًا إلى عيوب دون route/runtime evidence.

## أدلة الخطة المتاحة

أعيدت مطابقة وجود ملفات audit الأساسية المذكورة في الخطة، وتبقى أي ملفات مفقودة بحاجة إلى تسجيل صريح بدل افتراض وجودها. المصدر التفصيلي لجميع findings والقرارات والـphases محفوظ في `plan-reread-findings-inventory-ar.md`.

## Gate قبل Phase 0 التنفيذية

لا يبدأ تغيير backend أو mobile أو provider أو admin قبل تحديد source tree الصحيح لكل تطبيق، وتأكيد commit الأساس، وتجهيز Mongo/Redis مؤقتين وfixtures صناعية وfake PSP، وحسم قرارات الدفع والتأمين والرعاية المنزلية. لا يوجد في هذا baseline دليل على أن Phase 0 أو Phase 1 من الخطة قد أُغلقت بالكامل.

## مبدأ التتبع

كل finding يحتاج file/line/behavior evidence، وكل إصلاح يحتاج commit مستقلًا أو محدودًا، واختبارات قبل/بعد، وسجل rollback. لا تُعلن أي مرحلة مكتملة بسبب نجاح build فقط.

## Exact inventory captured after the second reread

```text
PLAN_LINES=341
WEB_BRANCH=agent/web-complete-v2-20260822
WEB_HEAD=543ce2e8f466db2279c2977216a7f185baf52323
REFERENCE_HEAD_PRESENT=missing
WEB_PAGE_COUNT=66
WEB_ROUTE_COUNT=31
WEB_TEST_COUNT=29
BACKEND_GIT_METADATA=no-git
BACKEND_BUILD=present
BACKEND_TEST_FILES=77
FINDING_IDS=F-001..F-015, WP-001..WP-006, MP-016..MP-021
```

The mobile archive root did not expose files at the inspected archive path, so mobile source parity cannot be declared complete from this probe. The reference commit named by the plan is not present in the current web clone, which is a baseline traceability blocker that must be resolved before claiming execution against that exact source state.

## Mobile archive correction

A direct `unzip -l` inspection confirmed that the Patient Mobile archive is populated and includes the expected source surface, including auth (`app/(auth)/login.tsx`, `register.tsx`, `otp.tsx`, `forgot-password.tsx`, `reset-password.tsx`), pharmacy (`app/pharmacy/checkout.tsx`, pharmacist chat), nursing (`service-info.tsx`, `service-details.tsx`, `nurse-profile.tsx`, `live-tracking.tsx`), diagnostics (`packages.tsx`, `package-detail.tsx`, `checkout.tsx`, `booking-success.tsx`, `insurance-upload.tsx`, `insurance-approval.tsx`), consultations, `src/services/auth`, `SessionManager`, `SecureStorageService`, `SocketContext`, and `DiagnosticsCartContext`. The earlier empty-root observation was a path/listing limitation, not evidence that the archive lacks source.

## Confirmed mobile source observations

The extracted mobile `src/utils/api.ts` contains device-bound guest provisioning through `POST /auth/guest`, stores the resulting access token in SecureStore with an AsyncStorage fallback, attaches `Authorization: Bearer` to requests, skips JSON Content-Type for FormData, retries GET requests once, and deliberately does not blindly retry mutations. These observations are source evidence for the plan's auth/upload/retry review; they do not by themselves establish that the guest flow is approved for every protected service or that all backend contracts are safe.

The mobile archive also contains nursing service/detail/nurse-profile/live-tracking screens, diagnostic checkout and booking-success screens, consultation booking/detail screens, auth state/session services, SocketContext, and security-oriented tests. These surfaces must be mapped to exact backend contracts before they can be marked complete.
