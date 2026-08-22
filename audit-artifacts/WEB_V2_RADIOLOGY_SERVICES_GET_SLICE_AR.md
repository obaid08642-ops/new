# Radiology Services — Contract Slice

## الحكم

**Services catalog: UNBLOCKED ومُنفذ من API حي.** تم التحقق الحي من `https://api.nabd.plus/api/v1/radiology/services`، وأعاد 40 خدمة، كما أعاد `/radiology/modalities` قائمة عامة من ستة أنواع. تم تنفيذ قائمة القراءة والفلاتر في `/[locale]/diagnostics/radiology`.

**Service detail: BLOCKED بسبب Backend Bug.** مسار detail لا يُعرض كرابط فعال في الويب حتى إصلاح backend؛ نتيجة الفحص الحي الحالية لـdetail هي 404 دائماً بسبب حقل `id` المخزن binary التالف حسب تقرير المراجع. لم يتم اختراع detail route أو fallback data.

## الفلاتر الحية

تم دعم الفلاتر التي ثبتت من API: `modality`, `body_part`, `home_visit`, `home_only`, `highest_rated`, `nearest`, `lowest_price`, و`search`. قائمة modality نفسها تُقرأ من `/radiology/modalities` ولا تُحفظ كبيانات mock.

## التنفيذ

أُضيف parser محدود يحوّل `_id`/`id`، الاسم العربي والإنجليزي، modality، body part، السعر، الوصف، preparation، popularity، مدة الفحص، زمن النتيجة، home/facility availability، contrast وimage URL. يتم strip لكل الحقول غير المسموح بها.

أُضيف wrapper server عام لا يمرر Authorization أو browser token، ويستخدم allowlist للـmodality والـboolean filters، مع حدود طول للبحث وbody part. الصفحة SSR تعرض الخدمات الحية، filter controls، حالات empty/error الصادقة، وترجمات EN/AR/UR/HI/BN/FIL، مع RTL وreduced-motion.

تفاصيل الخدمة تظهر كحالة `detailBlocked` غير قابلة للنقر، بدلاً من رابط سيعيد 404؛ يعاد فتحها بعد إصلاح backend وإثبات استقرار `GET /radiology/services/{id}`.

## التحقق الحي

| Endpoint | نتيجة الفحص |
|---|---|
| `GET /radiology/services` | HTTP 200، 40 خدمة |
| `GET /radiology/modalities` | HTTP 200، `ct`, `dexa`, `mammography`, `mri`, `ultrasound`, `xray` |
| Radiology detail | 404 حالياً بسبب backend binary-id bug |
| OTP OPTIONS metadata | HTTP 204 دون إرسال بيانات شخصية |
| backend git branch محلياً | غير متاح؛ workspace المفكوك لا يحتوي `.git` metadata |

## الاختبارات والبوابات

| Gate | Result |
|---|---|
| Targeted Radiology | 3 files / 5 tests passed |
| Full Vitest | **127 files passed، 14 skipped؛ 242 tests passed، 23 skipped** |
| Type-check | passed |
| Production build | passed؛ ظهر `/[locale]/diagnostics/radiology` |
| Sandbox | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |

## الإصلاح المطلوب في backend

يلزم إصلاح تخزين/قراءة `id` في Radiology Service من binary غير قابل للمقارنة إلى identifier ثابت public، ثم إضافة اختبار detail يعيد 200 للعنصر الموجود و404 لغير الموجود. حتى ذلك الوقت، Services القائمة جاهزة، وdetail محجوب بصدق.
