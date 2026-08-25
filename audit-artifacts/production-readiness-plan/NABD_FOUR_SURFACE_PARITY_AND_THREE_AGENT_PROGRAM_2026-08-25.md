# برنامج مطابقة الأسطح الأربعة وخطة ثلاثة Agents

## الحكم الصريح

لا، لا يوجد بعد دليل صادق على أننا اكتشفنا **كل** خطأ أو كل شاشة ناقصة أو كل داتا وهمية أو أننا حققنا parity بين Mobile وWeb أو أكملنا Provider وAdmin. ما تم حتى الآن هو قراءة دلالية واسعة وجرد ملفات وفجوات root controls، لكنه لا يثبت أن كل CTA وسيناريو وstate وjourney عملت فعليًا. يجب ألا يتحول هذا إلى ادعاء «مكتمل» أو «جاهز للإنتاج».

تظهر أرشيفات baseline الحالية **246 مرشح شاشة/route للمريض Mobile** بعد استبعاد test/spec و`_layout`، وهو قريب من رقم المالك التقريبي 249 لكنه ليس بعد عدًا بشريًا نهائيًا للشاشات المرئية. في المقابل يوجد 83 مرشح route/page للمريض Web، و45 لمزوّدي الخدمات، و42 للإدارة. هذه أرقام **جرد مصدر** وليست حكمًا بأن كل Mobile route يتطلب صفحة Web مستقلة؛ بعض الشاشات قد تكون modal أو state أو native-only، لكن كل اختلاف يجب أن يحصل على قرار موثق بدل تركه ناقصًا بلا تفسير.[1]

| السطح | مرشحو screen/route من المصدر | لديها action signal | لديها state signal | الوضع |
|---|---:|---:|---:|---|
| Patient Mobile | 246 | 245 | 183 | reference candidate؛ يحتاج review شاشة-بشاشة |
| Patient Web | 83 | 53 | 52 | parity غير مثبتة؛ يحتاج mapping إلى mobile أو قرار N/A |
| Provider | 45 | 41 | 36 | اكتمال onboarding/fulfillment/operations غير مثبت |
| Admin | 42 | 31 | 29 | governance/finance/operations coverage غير مثبت |

## 1. ما هو مثبت وما ليس مثبتًا

| الفئة | الحالة | التعامل الصحيح |
|---|---|---|
| 80 normalized root controls | أدلة تدقيق مطبّعة من السجل الخام | تدخل حوكمة وإصلاح بعد القرار والعقد |
| 62 static surface findings | تحتاج reconfirmation مستقل قبل أن تصبح item بناء | لا تعامل كعيب مؤكد تلقائيًا |
| 77 evidence-first rows | `CATALOG_ONLY__INSUFFICIENT_EVIDENCE` | لا تدخل backlog ولا يثبت بها parity |
| 40 mechanical rows | `REJECTED_MECHANICAL_ANCHOR` | تاريخ فقط؛ لا تستخدم في التخطيط |
| 628 mock/placeholder/TODO signals | مرشحات static، ومنها placeholder UI شرعي محتمل | يلزم disposition يدوي: backend contract أو test fixture أو legitimate copy أو remove |

> لا يصح أن نقول إن الـ628 signal هي 628 داتا وهمية. signal مثل `placeholder` قد يكون نصًا UX مشروعًا؛ و`mock` قد يكون fixture اختبار. يصبح defect فقط عندما يثبت أنه ظاهر في مسار production أو يخفي فشل عقد backend أو يعرض نجاحًا/سعرًا/تأمينًا/حالة غير حقيقية.

## 2. المطلوب قبل بناء parity: Master Screen–Action–Scenario Inventory

يجب تحويل كل مرشح شاشة إلى صف يدوي واحد على الأقل، وتسجيل كل CTA المؤثر كصف فرعي. لا يكفي عد الملف. يحمل كل صف:

| الحقل | شرط التعبئة |
|---|---|
| Stable Screen ID | مثال: `PM-PHARMACY-OFFERS-001` أو `PW-CONSULTATION-SLOT-001` |
| Surface/actor | Mobile/Web/Provider/Admin؛ patient/pharmacist/doctor/nurse/lab/radiology/admin role |
| exact source path + line | من baseline أو implementation branch |
| route/navigation/deep link | exact navigation وparams وعودة/back/cancel |
| visual status | موجود/مفقود/متباين/مقصود native-only/مقصود web-only مع قرار |
| CTA inventory | label/icon/action/disabled state/permission/confirmation |
| API/Socket contract | method/path/event، request/response/error DTO، auth/ownership |
| states | loading/empty/error/retry/offline/cancel/refund/expiry/validation/wrong-role |
| data truth | server/insurance/payment/provider source؛ لا client constant أو mock |
| accessibility/i18n | Arabic RTL، English، labels، contrast، reduced motion، keyboard/screen reader |
| test evidence | unit/contract/E2E/sandbox/physical-device/visual evidence أو `NOT_YET_TESTED` |
| disposition | `BUILD`, `FIX`, `BLOCKED_BY_BACKEND_CONTRACT`, `NATIVE_ONLY`, `WEB_ONLY_APPROVED`, `REMOVE`, `TEST_FIXTURE_ONLY` |

لا يحسب Screen ID «مغلقًا» حتى يراجع المراجع visual behavior وCTA والـcontract والحالات السلبية. وتنفذ مراجعة Mobile أولًا باعتباره المرجع المرئي والسلوكي، ثم يقرر لكل شاشة هل تقابلها Web page أو modal/state أو native-only capability.

## 3. برنامج Agent 1 — Patient Mobile + Patient Web Parity

**الملكية:** تجربة المريض وparity. **لا يملك:** اختراع backend APIs أو financial/insurance rules أو static fake states.

| Wave | نطاق Agent 1 | مخرج إلزامي |
|---:|---|---|
| A1.0 | جرد الـ246 Mobile routes والشاشات، ثم mapping إلى الـ83 Web candidates | master parity inventory؛ كل Mobile screen لها Web equivalent أو approved N/A rationale |
| A1.1 | Auth/profile/settings/location/family/health | screens + CTA states + contract status + RTL/a11y matrix |
| A1.2 | Pharmacy end-to-end | cart → request → offers → selected offer → Cash/Card/COD أو Insurance → co-pay → tracking/cancel/refund |
| A1.3 | Consultations | discovery → doctor → slot → cash/insurance decision/co-pay → confirmation/call/cancel/reschedule/report |
| A1.4 | Labs/radiology/home-care/nursing | discovery → selection → scheduling/insurance → results/visit/report/tracking |
| A1.5 | prescriptions/chat/support/reports/community | PHI scope، attachment safety، escalation، empty/error/retry |
| A1.6 | UI polish | premium vector design system، meaningful animation، skeleton/loading، reduced-motion، no emoji/AI-template appearance |

**قاعدة parity:** لا يلزم نسخ native-only behavior حرفيًا إذا كان غير مناسب للويب، لكن يجب أن يوجد Web equivalent يحفظ هدف المستخدم، أو قرار موافق عليه يشرح السبب والبديل.

## 4. برنامج Agent 2 — Provider application

**الملكية:** onboarding، identity، operations، offers، fulfillment، insurance decision، clinical execution، dashboards، settings. **لا يملك:** تغيير patient ledger أو policy أو admin approval بلا عقد.

| Wave | نطاق Agent 2 | مخرج إلزامي |
|---:|---|---|
| B2.0 | Provider screen/action inventory لكل 45 candidate | role-specific matrix: pharmacy/doctor/lab/radiology/nursing/facility |
| B2.1 | signup/onboarding/KYC/license/facility binding/review/settings | pending/approved/rejected/expired/error states بلا bypass |
| B2.2 | Pharmacy provider journey | broadcast inbox → quote per line/availability/substitution/ETA → selected order → prep/delivery/COD/insurance decision |
| B2.3 | Doctor/provider bookings | schedule/slot/insurance review/co-pay outcome/consultation lifecycle/call/report |
| B2.4 | Labs/radiology/nursing/home-care operations | eligibility, booking/visit, samples/results/reports, field tracking, supply chain |
| B2.5 | Finance/insurance/payout visibility | decision evidence، co-pay، reconciliation، disputes؛ no direct ledger manipulation |
| B2.6 | Provider quality | permissions، PHI minimization، offline/field failure modes، notifications/chat safety |

## 5. برنامج Agent 3 — Admin dashboard

**الملكية:** governance، moderation، operations، finance controls، support، observability. **لا يملك:** master bypass غير مسجل أو تعديل مالي/سريري صامت.

| Wave | نطاق Agent 3 | مخرج إلزامي |
|---:|---|---|
| C3.0 | جرد 42 admin route/page وCTA/role matrix | admin inventory with role, authorization, audit and destructive-action state |
| C3.1 | RBAC/JIT elevation/audit | support/finance/clinical/catalog/security/super-admin separation وbreak-glass policy |
| C3.2 | Catalog/provider governance | provider onboarding، content/catalog publication، insurance configuration، policy approvals |
| C3.3 | Operations command center | exception queues، broadcast visibility، order/booking escalation، SLA، notifications |
| C3.4 | Financial governance | payment/webhook reconciliation، refunds/disputes، settlement exports، maker-checker |
| C3.5 | Security/privacy operations | risk/device/session review، PHI access audit، retention/deletion/export requests |
| C3.6 | Analytics and release controls | redacted metrics، feature flags، deployment/rollback dashboards، incident workflow |

## 6. Backend/Data owner — مسار مشترك إجباري

لا ينبغي أن يعمل الثلاثة بمعزل عن Backend/Data. يلزم owner مشترك أو agent رابع/مراجع مركزي يوافق عقود كل slice قبل أن يبدأ أي agent UI integration.

| مسؤولية Backend/Data المشتركة | يمنع ماذا؟ |
|---|---|
| OpenAPI/DTO/error taxonomy/state transitions | زر موجود بلا API أو route مختلف أو success وهمي |
| RBAC/ownership/consent policy | BOLA، cross-tenant، provider/admin bypass |
| price/stock/quote/insurance/payment/ledger source of truth | تسعير عميل، settlement خاطئ، co-pay وهمي |
| idempotency/locking/outbox/webhooks | duplicate orders/payments، slot race، phantom confirmation |
| migrations/data governance | corruption، seed/mock leakage، untracked schema change |
| sandbox/runtime ownership | اختبار حساب حقيقي أو claim غير مثبت |

## 7. التنسيق بين Agents ومنع التعارض

| القاعدة | التطبيق |
|---|---|
| لا shared API changes من UI agent | Backend owner فقط يغير contract؛ الآخرون يستخدمون generated/typed client |
| Branch per slice | `agent/patient-*`، `agent/provider-*`، `agent/admin-*`؛ لا merge إلى main مباشرة |
| Contract freeze window | لا يبدأ UI slice قبل قبول version من OpenAPI/DTO/state machine |
| Definition of Done موحد | UI + contracts + negative states + owner/stranger/unauth + replay + a11y + no mock + evidence |
| Review board | Backend/Data owner + Security + Product + QA يراجع slice قبل دمجه |
| Conflict management | تغيرات shared design system أو i18n أو analytics تدخل RFC صغيرة منفصلة |

## 8. تسلسل التنفيذ المقترح

1. **إكمال master inventory يدويًا**؛ لا parity claim قبل ذلك.
2. **Backend foundation:** identity, ownership, state machines, financial truth, observability.
3. **Pharmacy cash/COD** ثم **Pharmacy insurance/co-pay**؛ لأنها تختبر offers/stock/settlement.
4. **Consultation cash** ثم **Consultation insurance**.
5. **Labs/radiology** ثم **nursing/home-care** بعقود visits/results/PHI.
6. **Family/health/prescription/chat/support** مع consent/PHI.
7. **Admin governance وProvider finance/operations** لكل slice، لا في نهاية المشروع فقط.
8. **Public SEO/performance/release** فقط بعد publication governance وبيانات حقيقية.

## 9. بوابة «صفر داتا وهمية» الصحيحة

لا تقاس ببحث كلمة `mock` أو `placeholder` فقط. لكل signal من الجرد، توثّق نتيجة واحدة: `TEST_FIXTURE_ONLY` أو `LEGITIMATE_UI_COPY` أو `REAL_BACKEND_CONTRACT` أو `REMOVE`. وأي مسار إنتاج يظهر سعرًا، تأمينًا، offer، order، appointment، stock، result، message، provider، أو analytics data بلا مصدر خادمي مصرح يظل blocker.

## المراجع

[1]: `SURFACE_SCREEN_ROUTE_CANDIDATES_SUMMARY_2026-08-25.json` و`SURFACE_SCREEN_ROUTE_CANDIDATES_2026-08-25.tsv` داخل حزمة التخطيط.
