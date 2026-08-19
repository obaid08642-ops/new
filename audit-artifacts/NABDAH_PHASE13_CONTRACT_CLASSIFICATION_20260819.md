# منصة نبض — Phase 13: تصنيف عقود API ومسارات المستهلكين

**التاريخ:** 19 أغسطس 2026  
**الفرع الحاكم:** `manus/on-live-reconciliation`  
**رأس الفحص:** `9fdd99921023547080358858223f577c663a1b66`  
**الحالة:** جرد مصدر ثابت مكتمل؛ لا يمثل قبولاً تشغيلياً أو تصريح نشر.

## المنهج

استخرج الفحص الثابت مسارات Nest من جميع ملفات Backend، مع دعم الملفات متعددة الـController وaliases المعرّفة كمصفوفة، وطبع base URL و`/api/v1` والاستعلامات والمعاملات الديناميكية في تطبيقات Patient وProvider وAdmin. ثم جرى ربط كل استدعاء بـmethod/path خادمي محتمل. لا يحول تطابق المسار وحده أي عقد إلى PASS؛ فالدور وBOLA والـDTO وانتقال الحالة والمثابرة والتدقيق والإثبات الحي لا تزال مراجع مستقلة.

| المقياس | النتيجة |
|---|---:|
| مسارات Backend المرصودة | 1,342 |
| مواضع استدعاء المستهلك الخام | 333 |
| العقود الفريدة بعد التجميع | 238 |
| Provider: تطابق method/path أولي | 215 |
| Provider: مرشح مفقود/راكد | 10 |
| Patient: تطابق method/path أولي | 4 |
| Admin: تطابق method/path أولي | 7 |
| مسارات ديناميكية لا يمكن حسمها ثابتاً | 2 |

البيانات الخام والملخص النهائي موجودان في `NABDAH_PHASE13_CONTRACT_INVENTORY_V4_20260819.json` و`NABDAH_PHASE13_CONTRACT_INVENTORY_V4_SUMMARY_20260819.md`.

## التصنيف الكامل للمرشحات غير المطابقة

| المستهلك | الاستدعاء | الحكم | العقد أو الإجراء التالي |
|---|---|---|---|
| Admin PublicDirectory | base URL ديناميكي | **INCONCLUSIVE** | هو ناقل URL عام، لا route وظيفي محدد. يتطلب تتبع runtime عند E2E Phase 16؛ لا تعديل الآن. |
| Patient RemoteDataSource | `DELETE /:dynamic` | **INCONCLUSIVE** | طبقة بيانات عامة لا تحدد resource ثابتاً. يصنف مع كل consumer فعلي في Phase 16؛ لا يجوز افتراض endpoint. |
| Provider connectivity probe | `fetch('https://1.1.1.1')` | **NON-PRODUCT NETWORK PROBE** | ليس API للمنصة؛ لا يدخل في عقد Backend ولا يثبت توافر الخدمة. |
| DoctorChatTab | `GET /chats/provider` | **STALE** | Backend يملك `GET /chats/threads` ومصادقة participant. يلزم Phase 14 مراجعة DTO وإعادة الربط أو fail-closed. |
| DoctorChatTab | `GET/POST /chats/:id/messages` | **STALE** | Backend يملك `GET/POST /chats/threads/:threadId/messages`. يلزم التحقق من thread type والمشارك قبل التصحيح. |
| Doctor dashboard | `POST /provider/chat/send` | **MISSING** | لا Controller مطابق. يحتفظ بالـfail-closed إلى أن يثبت عقد thread/message؛ لا redirect تخميني. |
| NursingDashboard | `GET /home-care/visits` | **STALE** | العقد الفعلي `GET /nursing/visits` ويقيد المزود من الرمز. يلزم Phase 14 توحيد consumer/DTO واختبارات ownership. |
| NursingDashboard | `POST /home-care/visits/:id/respond` | **STALE** | العقد الفعلي `POST /nursing/visits/:id/respond` مع transition `NEW_REQUEST → CONFIRMED`. يلزم Phase 14 اختبار قبول/رفض/مزوّد أجنبي. |
| Blueprint nursing note | `POST /home-care/notes` | **STALE** | العقد الفعلي `POST /nursing/notes` ويطلب `patient_id` و`booking_id` وnote/vitals. يبقى محجوباً لحين مواءمة body والملكية. |
| ContractModal | `GET /legal/policy/provider_agreement` | **STALE** | العقد الفعلي `GET /legal/policy/:key?lang=...`. يجب استخدام `provider_agreement` كـkey فقط بعد تحقق النسخة. |
| ContractModal | `POST /legal/accept/provider_agreement` | **STALE** | العقد الفعلي `POST /legal/accept/:key` تحت JWT ويسجل القبول والنسخة خادمياً. يلزم Phase 14 تعديل المسار واختبار نجاح/رفض/دور. |
| Pharmacy inventory screen | `GET /pharmacy/inventory/expiry` | **MISSING** | يوجد expiry في schema فقط ولا يوجد Controller موثق. لا يعرض screen نتيجة تشغيلية قبل عقد inventory owned/audited أو احتواء صريح. |

## تصنيف بقية الجرد

كل من العقود الأخرى الـ226 صار له أحد التصنيفين التاليين ولا يبقى consumer route بلا حالة:

| الحالة | المعنى | الاستمرار |
|---|---|---|
| `WIRED_CANDIDATE` | يوجد تطابق method/path في مصدر Backend. | Phase 14 يراجع schema، role، ownership، transition، audit وfail-closed؛ Phase 16 يثبت التشغيل الحي. |
| `MISSING_OR_STALE_CANDIDATE` | لا يوجد تطابق ثابت، ثم حسمت المجموعة المتبقية في الجدول أعلاه كـSTALE أو MISSING. | تدخل Phase 14 فقط بعقد معروف أو تبقى fail-closed. |
| `INCONCLUSIVE_DYNAMIC_BASE` | المسار يبنى في طبقة عامة ولا يكفي المصدر الثابت لحسمه. | يسجل كـINCONCLUSIVE ولا يتحول إلى PASS قبل E2E trace. |

## بوابة خروج Phase 13

تحقق شرط الجرد: لا يبقى API consumer candidate بلا تصنيف أولي، وسجلت المسارات الراكدة/المفقودة والعقود الديناميكية ومصادرها. لا يتحقق بعد قبول Phase 13 الكامل للأزرار غير المرتبطة بـAPI أو لكل schema/state/ownership؛ ولذلك تنتقل هذه العناصر إلى Phase 14 كـFIX أو FAIL-CLOSED أو Phase 16 كـINCONCLUSIVE مع دليل Sandbox.

> **قرار المرحلة:** يمكن بدء Phase 14 على العيوب المؤكدة فقط: مسارات اتفاقية المزود الراكدة، مسارات التمريض الراكدة، سطح دردشة الطبيب الراكدة، وسطح انتهاء الصلاحية غير ذي العقد. لا يوجد نشر للخادم ولا تفعيل لعقد حساس في هذه المرحلة.
