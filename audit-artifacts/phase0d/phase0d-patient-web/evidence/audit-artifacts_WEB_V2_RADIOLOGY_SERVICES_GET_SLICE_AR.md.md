# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_RADIOLOGY_SERVICES_GET_SLICE_AR.md`
- **Member SHA-256:** `651cf0cf59984eb53aa5945f0db4d5c3214b4bccc1cd7a6c2ba3de183e082a18`
- **Line count:** 43
- **Read range:** `1-43`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: **Service detail: BLOCKED بسبب Backend Bug.** مسار detail لا يُعرض كرابط فعال في الويب حتى إصلاح backend؛ نتيجة الفحص الحي الحالية لـdetail هي 404 دائماً بسبب حقل `id` المخزن binary التالف حسب تقرير المراجع. لم يتم اختراع detail route أو fa`
### backend_consumers_or_contracts
- `5: **Services catalog: UNBLOCKED ومُنفذ من API حي.** تم التحقق الحي من `https://api.nabd.plus/api/v1/radiology/services`، وأعاد 40 خدمة، كما أعاد `/radiology/modalities` قائمة عامة من ستة أنواع. تم تنفيذ قائمة القراءة والفلاتر في `/[locale]/di`
- `11: تم دعم الفلاتر التي ثبتت من API: `modality`, `body_part`, `home_visit`, `home_only`, `highest_rated`, `nearest`, `lowest_price`, و`search`. قائمة modality نفسها تُقرأ من `/radiology/modalities` ولا تُحفظ كبيانات mock.`
- `19: تفاصيل الخدمة تظهر كحالة `detailBlocked` غير قابلة للنقر، بدلاً من رابط سيعيد 404؛ يعاد فتحها بعد إصلاح backend وإثبات استقرار `GET /radiology/services/{id}`.`
- `25: | `GET /radiology/services` | HTTP 200، 40 خدمة |`
- `26: | `GET /radiology/modalities` | HTTP 200، `ct`, `dexa`, `mammography`, `mri`, `ultrasound`, `xray` |`
- `38: | Production build | passed؛ ظهر `/[locale]/diagnostics/radiology` |`
### auth_ownership
- `17: أُضيف wrapper server عام لا يمرر Authorization أو browser token، ويستخدم allowlist للـmodality والـboolean filters، مع حدود طول للبحث وbody part. الصفحة SSR تعرض الخدمات الحية، filter controls، حالات empty/error الصادقة، وترجمات EN/AR/UR/HI`
- `28: | OTP OPTIONS metadata | HTTP 204 دون إرسال بيانات شخصية |`
### state_transitions
- `17: أُضيف wrapper server عام لا يمرر Authorization أو browser token، ويستخدم allowlist للـmodality والـboolean filters، مع حدود طول للبحث وbody part. الصفحة SSR تعرض الخدمات الحية، filter controls، حالات empty/error الصادقة، وترجمات EN/AR/UR/HI`
### payment_insurance_relevance
- `11: تم دعم الفلاتر التي ثبتت من API: `modality`, `body_part`, `home_visit`, `home_only`, `highest_rated`, `nearest`, `lowest_price`, و`search`. قائمة modality نفسها تُقرأ من `/radiology/modalities` ولا تُحفظ كبيانات mock.`
### error_empty_loading_retry_cancel
- `17: أُضيف wrapper server عام لا يمرر Authorization أو browser token، ويستخدم allowlist للـmodality والـboolean filters، مع حدود طول للبحث وbody part. الصفحة SSR تعرض الخدمات الحية، filter controls، حالات empty/error الصادقة، وترجمات EN/AR/UR/HI`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
