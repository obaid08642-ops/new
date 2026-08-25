# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_CONTRACT_CLASSIFICATION_20260819.md`
- **Member SHA-256:** `ff6e08b94a747880dac4f71687835e57c946b3b061ee28c6773743d5fbe70aaf`
- **Line count:** 56
- **Read range:** `1-56`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: | Admin PublicDirectory | base URL ديناميكي | **INCONCLUSIVE** | هو ناقل URL عام، لا route وظيفي محدد. يتطلب تتبع runtime عند E2E Phase 16؛ لا تعديل الآن. |`
- `37: | Blueprint nursing note | `POST /home-care/notes` | **STALE** | العقد الفعلي `POST /nursing/notes` ويطلب `patient_id` و`booking_id` وnote/vitals. يبقى محجوباً لحين مواءمة body والملكية. |`
- `40: | Pharmacy inventory screen | `GET /pharmacy/inventory/expiry` | **MISSING** | يوجد expiry في schema فقط ولا يوجد Controller موثق. لا يعرض screen نتيجة تشغيلية قبل عقد inventory owned/audited أو احتواء صريح. |`
- `44: كل من العقود الأخرى الـ226 صار له أحد التصنيفين التاليين ولا يبقى consumer route بلا حالة:`
### backend_consumers_or_contracts
- `10: استخرج الفحص الثابت مسارات Nest من جميع ملفات Backend، مع دعم الملفات متعددة الـController وaliases المعرّفة كمصفوفة، وطبع base URL و`/api/v1` والاستعلامات والمعاملات الديناميكية في تطبيقات Patient وProvider وAdmin. ثم جرى ربط كل استدعاء بـ`
- `31: | Provider connectivity probe | `fetch('https://1.1.1.1')` | **NON-PRODUCT NETWORK PROBE** | ليس API للمنصة؛ لا يدخل في عقد Backend ولا يثبت توافر الخدمة. |`
- `35: | NursingDashboard | `GET /home-care/visits` | **STALE** | العقد الفعلي `GET /nursing/visits` ويقيد المزود من الرمز. يلزم Phase 14 توحيد consumer/DTO واختبارات ownership. |`
- `36: | NursingDashboard | `POST /home-care/visits/:id/respond` | **STALE** | العقد الفعلي `POST /nursing/visits/:id/respond` مع transition `NEW_REQUEST → CONFIRMED`. يلزم Phase 14 اختبار قبول/رفض/مزوّد أجنبي. |`
- `37: | Blueprint nursing note | `POST /home-care/notes` | **STALE** | العقد الفعلي `POST /nursing/notes` ويطلب `patient_id` و`booking_id` وnote/vitals. يبقى محجوباً لحين مواءمة body والملكية. |`
- `40: | Pharmacy inventory screen | `GET /pharmacy/inventory/expiry` | **MISSING** | يوجد expiry في schema فقط ولا يوجد Controller موثق. لا يعرض screen نتيجة تشغيلية قبل عقد inventory owned/audited أو احتواء صريح. |`
### auth_ownership
- `10: استخرج الفحص الثابت مسارات Nest من جميع ملفات Backend، مع دعم الملفات متعددة الـController وaliases المعرّفة كمصفوفة، وطبع base URL و`/api/v1` والاستعلامات والمعاملات الديناميكية في تطبيقات Patient وProvider وAdmin. ثم جرى ربط كل استدعاء بـ`
- `20: | Admin: تطابق method/path أولي | 7 |`
- `29: | Admin PublicDirectory | base URL ديناميكي | **INCONCLUSIVE** | هو ناقل URL عام، لا route وظيفي محدد. يتطلب تتبع runtime عند E2E Phase 16؛ لا تعديل الآن. |`
- `35: | NursingDashboard | `GET /home-care/visits` | **STALE** | العقد الفعلي `GET /nursing/visits` ويقيد المزود من الرمز. يلزم Phase 14 توحيد consumer/DTO واختبارات ownership. |`
- `48: | `WIRED_CANDIDATE` | يوجد تطابق method/path في مصدر Backend. | Phase 14 يراجع schema، role، ownership، transition، audit وfail-closed؛ Phase 16 يثبت التشغيل الحي. |`
- `54: تحقق شرط الجرد: لا يبقى API consumer candidate بلا تصنيف أولي، وسجلت المسارات الراكدة/المفقودة والعقود الديناميكية ومصادرها. لا يتحقق بعد قبول Phase 13 الكامل للأزرار غير المرتبطة بـAPI أو لكل schema/state/ownership؛ ولذلك تنتقل هذه العناصر`
### state_transitions
- `36: | NursingDashboard | `POST /home-care/visits/:id/respond` | **STALE** | العقد الفعلي `POST /nursing/visits/:id/respond` مع transition `NEW_REQUEST → CONFIRMED`. يلزم Phase 14 اختبار قبول/رفض/مزوّد أجنبي. |`
- `54: تحقق شرط الجرد: لا يبقى API consumer candidate بلا تصنيف أولي، وسجلت المسارات الراكدة/المفقودة والعقود الديناميكية ومصادرها. لا يتحقق بعد قبول Phase 13 الكامل للأزرار غير المرتبطة بـAPI أو لكل schema/state/ownership؛ ولذلك تنتقل هذه العناصر`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
