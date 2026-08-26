# HANDOFF — خطة إنتاج المريض: حالة التنفيذ والخطوات التالية

**الفرع المحلي:** `release/patient-production` (workstation) — 5 commits
**المرجع الحاكم:** PATIENT_PRODUCTION_PLAN.md + قواعد PH-PHARMACY/PH-SERVICE (منسوخة في packages/shared-contracts/src/state-machines.ts)

## ✅ منجز ومُثبّت (مع بوابات greps خضراء)
1. **A:** workstation نظيف، DECISIONS_LOCKED.md، shared-contracts، CI skeleton — commit `bcbfcbf`
2. **B أمن:** 20 إصلاحًا (سك محفظة/ledger/provider-ops ownership×4/chat WS membership/slot partial-unique+Redis lock 10د owner-release/refund من DB/reschedule يرث الدفع/Moyasar IDOR/Paymob مبلغ سيرفري/login crash/logout purge/OTP resend/تأكيد دفع بالسيرفر/CSRF×10 routes/CSP dot/session whitelist) — commit `612c84a`
3. **C الصيدلية الحاكم كامل الثلاث طبقات:**
   - Backend: حالات awaiting_offer_selection/offer_selected + transitions؛ وضع PATIENT يعطل auto-lock؛ recordOfferResponse؛ GET offers (أسعار سيرفورية من inventory)؛ select-offer (snapshot+allocation+lock broadcast)؛ COD endpoint؛ payments kind `pharmacy-order` (المبلغ = selected_offer snapshot، webhook يؤكد CONFIRMED) — commit `2610216`
   - Mobile: checkout يرسل الطلب بلا دفع → شاشة /pharmacy/offers جديدة (مقارنة+اختيار) → payment بـ payKind=pharmacy-order + زر COD — commit `2610216`
   - Web: BFF routes (CSRF+zod) ×4 + صفحات offers/select/pay — commit `151dbef`
4. **D الاستشارات تأمين:** حقول appointment التأمينية؛ create لا يؤكد التأمين مبكرًا؛ decide() ينعكس على الموعد؛ copay settlement يؤكد CONFIRMED؛ رابط موبايل موجود — commit `b0bd5ef`

## ✅ تحديث الجلسة الحالية (10 commits)
- **E مكتمل**: mirrors lab/radiology/nursing + شاشة /diagnostics/book موبايل + ويب صفحة حجز وBFF `/api/bookings/[kind]` — commit 74826b3 + 42a52cc
- **F مكتمل**: booked_for_member_id يُحفظ (assertFamilyBookingRight الموجود هو المرجع، الصلاحية 'booking')؛ GET /users/me/export؛ أزرار data.tsx الثلاثة تعمل — commit 6237429
- **J جزئي**: docker-compose.prod.yml أُصلح كليًا (MONGO_URL/PORT=8002/healthchecks/limits/mongo auth) — commit 5412d5c

## ✅ دفعة H+J (commit f24e344)
- AppErrorBoundary مُركّب على جذر الموبايل (كان غير موصول نهائيًا)
- توحيد deep-link scheme: nabdahplus→nabdplus في theme + deepLinks
- backend/e2e/governing-rules.js: مصفوفة تحقق القواعد الحاكمة (10 probes) — تشغيلها على staging: BASE_URL=... node e2e/governing-rules.js

## ✅ دفعة G+I (commits 55659a8, 55bc074)
- **G**: `POST /patient/pharmacy/orders/:id/pay-wallet` — خصم ذري محروس ($gte) + قيد ledger + CONFIRMED فوري
- **I/X12**: جذر الويب `<html lang dir>` يتبع اللغة الفعلية (ar/ur=rtl، البقية ltr)

## ✅ دفعة I-wave1 (commit e492929)
- robots: medicine-catalog أصبح عامًا؛ proxy يسمح بفهرسة medicine-catalog/specialties/articles لكل لغة؛ sitemap ينشرها؛ صفحة الكتالوج index:true (التفاصيل تبقى noindex حتى DTO)

## ✅ دفعة E-completion (db2eb00 + 4f4cbec + 9f278b1)
- **Backend (db2eb00):** إصلاح صامت خطير — mongoose strict كان يحذف حقول المرايا `payment_status/transaction_id/paid_at/insurance_copay_amount` في lab/radiology/homecare (أُضيفت كـ props)؛ مرايا التأمين أصبحت lowercase مطابقة للenums؛ `radiology book()` لم يعد ينشر body خامًا (كان mass-assignment على state/payment_status) بل whitelist؛ member_id → booked_for_member_id محفوظ في المخططات الثلاثة خلف فحص family ('booking' permission)؛ homecare createBooking يقبل provider_id (مُعتمد تمريض فقط) فيمكن إنشاء insurance request، والتأمين يبدأ PENDING_INSURANCE.
- **Mobile (4f4cbec):** مسار التمريض الحقيقي — تأمين: POST /insurance/requests {booking_kind:'nursing'} → payment-split (لم يكن يحدث شيء فعليًا!)؛ نقدي: /payments/intent/nursing/:id → processing؛ حارس reviews فارغة.
- **Web (9f278b1):** صفحة /[locale]/home-care/book عبر ServiceBookingForm مشترك؛ BFF bookings يرسل service_id أعلى المستوى (كان يكسر homecare)؛ خيار التأمين مخفي للتمريض ويبًا (لا اختيار ممرض = لا مزود لطلب التأمين).
- **بوابات greps:** الحقول×3 schemas ✓، mirrors lowercase ✓، لا raw spread ✓، مسارات الموبايل ✓، توازن أقواس ✓. البناء الفعلي مؤجل لبابة J (كما هو متفق).

## 🔄 مطابقة الوكيل دفعة-2 (22 commit توثيق 0B)
- ~302 صفًا جديدًا تتركز في: events-admin (لا DTO/حدود/PII-projection F-3026..38) + mongoose-indexes contract يغطي 4 مخططات فقط ولا يختبر TTL/partial-unique/overlap/tenant (F-3039..45).
- لا ثغرة استغلالية جديدة خارج سجلنا المدمج → بنود: B2 تقسية حدود الاستعلام، و3 حوكمة فهارس شاملة، وJ تشغيل المصفوفة عليها.

## ✅ WEB PARITY دفعة-1 (4990f6e + 0535f68 + ضمن 6aa7f3f)
- **البند 11 (D-ويب) — commit 0535f68:** فرع التأمين في حجز الاستشارة + صفحة copay→تأكيد. unified-bookings يقبل payment_method=insurance (4990f6e)؛ BFF book يرسل الطلب بلا دفع ثم POST /insurance/requests؛ صفحة /[locale]/insurance/requests/[requestId] تعرض عقد التحمّل السيرفري مع أفعال الحالات الثلاثة (تسوية صفرية / checkout 303 / رابط الموعد المؤكد)؛ بطاقات المطالبات في /insurance تصير روابط.
- **البند 12 (G-ويب) — محتواه داخل commit 6aa7f3f** (التقطه الوكيل الموازي ضمن commit موسوم docs — المحتوى كامل وصحيح): صفحة pay تعرض مبلغ snapshot العرض + رصيد المحفظة الحي، وفرعا الدفع عبر BFF: pay-wallet (خصم ذري ثم تحويل للمؤكد) وpayment-intent (303 للبوابة). البوابات: ZERO-MOCK نظيف + أدلة endpoints page.tsx:42,50 وpay-wallet/route.ts:30 + توازن أقواس.
- **تحذير تشغيلي:** وكيل متوازٍ يلتقط الملفات غير المثبتة عبر git add شامل مرارًا (c48c1bd, 670c276, b64adc9, 6aa7f3f) — رسائلها "docs:" مضللة. يلزم عزل الجلسات بـ worktrees أو قفل متبادل قبل بوابة J.

## ✅ WEB PARITY دفعة-2 — الشات وweb-push (6036135 + 9ecbe8c)
- **البند 13 (شات) — commit 6036135:** composer إرسال حقيقي عبر BFF POST messages (zod+CSRF+idempotency، dedupe بclient_message_id upstream) + mark-read receipts عند فتح المحادثة + refresh دوري مرئي-واعٍ حتى بوابة J؛ صفحة المحادثة تعرض نصوص الرسائل (المستخرج أُضيف له body) مع تمييز رسائلي. **المتبقي ضمن البند:** socket.io client realtime (يتطلب تثبيت اعتمادية — مؤجل لبابة J) + مرفقات الوسائط (تحتاج مسار رفع media_ids).
- **البند 14 (web-push) — commit 9ecbe8c:** sw.js جديد يعالج push وnotificationclick (deep-link عبر data.url)؛ BFF vapid-key/subscribe/unsubscribe فوق endpoints /push/web/* الموجودة؛ زر تفعيل/إيقاف حقيقي في /notifications.
- **بوابات:** ZERO-MOCK grep نظيف على كل الملفات الجديدة + أدلة endpoints (messages/route.ts:29، read/route.ts:24، vapid-key/route.ts:10، subscribe/route.ts:24، unsubscribe/route.ts:19) + توازن أقواس ✓.

## ✅ WEB PARITY دفعة-3 — البنود 15–33 كاملة (dfa5ae5 → 8a34ad0)
كل بند: بناء BFF موحد (zod+CSRF+idempotency) فوق endpoints باكند حقيقية → بوابة ZERO-MOCK grep + دليل FILE:LINE + توازن أقواس → commit فوري. الجدول أعلاه محدّث بحالة كل بند وcommitه:
- **15 عائلة** dfa5ae5: create/invite/join/leave/permissions/remove + member_id في bookings BFF والنماذج.
- **16 صحة** ba6b56d: vitals/sleep/mood كتابة (تحقق فسيولوجي upstream).
- **17 حمل** 97dc87a: profile/kicks/contractions/infant-growth.
- **18 تغذية** ec403f7: meals/water/profile targets.
- **19 نفسية** 4bf0786: breathing/meditation session logging (+mood من ba6b56d).
- **20 AI** 3dde1e7: triage/ocr-translate/skin-analysis — النتائج verbatim من السيرفر.
- **21 ماسح أدوية** 17e22bc: barcode-lookup + drug-interactions (يدويًا؛ الكاميرا جوال).
- **22 ولاء** 0092458: rewards/challenges/leaderboard/referral مع claim/join/apply.
- **23 عروض** f785924: endpoint جديد GET /offers (قائمة الحملات المعتمدة) + index/detail ويب. redeem المخصص معلّق على قرار D-021 (الاستبدال يمر عبر نقاط الولاء عند الدفع).
- **24 خريطة مزودين** 32064fc: /providers/map + type/lat/lng/radius filters.
- **25 دعم** 2c62cca: تذاكر إنشاء/قائمة/thread/reply.
- **26 إرجاع** c0cfbcb: /refunds/request + my (النسبة والمبلغ من سجلات الخادم F-C6).
- **27 مراجعات** da5e5f9: POST /ratings upsert + إعادة حساب المتوسط.
- **28 إعدادات** aaef7da: PATCH profile allowlisted + locale sync (D-026) + قنوات/فئات الإشعارات. re-auth لكلمة المرور/2FA مسار أمني منفصل لم يُمس.
- **29 برامج علاجية** 1d802f4: enroll/complete-session.
- **30 طوارئ** a571f0→a57a1f0: trigger/cancel/my-active (موقع اختياري 5s timeout).
- **31 مجتمع** c0b000a: post/vote/comment.
- **32 wearables** c863f24: إدخال يدوي source=manual على الخادم.
- **33 بحث متقدم+مقارنة** 8a34ad0: q/category/page + POST /medicines/compare.

**المتبقي الصريح بعد دفعة-3** (موثق في الجدول): socket.io realtime ومرفقات الشات ورفع الاعتماديات (J)، رسم trends التفاعلي، monthly-report (يحتاج endpoint باكند جديد — خارج نطاق اللمسات الدقيقة)، redeem مخصص (D-021)، خريطة تفاعلية كاملة، شات دعم حي (يعمل عبر #13)، re-auth أمني. البوابات الفعلية للبناء الكامل تبقى عند J كما هو متفق.


## 🖥️ WEB PARITY BUILD — الويب مرآة الموبايل بصيغة Next (مطلب المالك)
منجز ويبًا: auth + حجز استشارات + مسار الصيدلية الحاكم كاملًا + قراءة السطوح + SEO wave-1 + تأمين الاستشارة/copay + المحفظة على العروض + الشات composer/receipts + web-push.
المتبقي بالترتيب:
1. ~~E-ويب تمريض~~ ✅ (9f278b1)
2. ~~D-ويب تأمين الاستشارة~~ ✅ (4990f6e + 0535f68)
3. ~~G-ويب محفظة~~ ✅ (ضمن 6aa7f3f)
4. H-ويب: socket.io client realtime + مرفقات شات — بعد تثبيت الاعتماديات في J
5. I-ويب تفاصيل دواء بعد DTO + JSON-LD Drug — 1ي
6. J: تشغيل governing-rules probes ضد الويب ضمن المصفوفة النهائية

## 🖥️ WEB PARITY BACKLOG — القائمة الكاملة شاشة-بشاشة (المرآة الإلزامية)
✅=منجز ويبًا | 🔨=متبقي (بالترتيب). المصدر المرجعي: مجموعات شاشات الموبايل الـ249.

| # | المجموعة/الشاشات | الحالة |
|---|---|---|
| 1 | auth: login/password+OTP+2FA/session/logout | ✅ |
| 2 | dashboard الرئيسية + upcoming appointment | ✅ |
| 3 | استشارات: أطباء/تخصصات/تفاصيل طبيب+slots/حجز/إلغاء/إعادة جدولة | ✅ |
| 4 | صيدلية: كتالوج/تفاصيل دواء/سلة(إضافة+حذف)/checkout إرسال/عروض مقارنة/اختيار/دفع بطاقة/COD | ✅ |
| 5 | طلباتي + تتبع + تفاصيل (كل الأنواع) | ✅ |
| 6 | وصفاتي (قراءة) + تذكيرات (قائمة) | ✅ 🔨أفعال الكتابة ضمن F-web |
| 7 | ملف شخصي + جلسات + خصوصية (قراءة) | ✅ 🔨تحرير ضمن F-web |
| 8 | مقالات + قائمة + bookmarks | ✅ 🔨عرض body بعد CMS |
| 9 | **حجز تمريض منزلي (صفحة+نموذج)** | 🔨 0.5ي |
| 10 | **حجز مختبر + أشعة (نماذج cash/insurance)** | 🔨 يوم |
| 11 | **فرع تأمين الاستشارة + صفحة copay→تأكيد** | 🔨 يوم |
| 12 | **زر المحفظة على العروض/الدفع + topup/transactions/cards** | 🔨 0.5ي |
| 13 | شات: composer إرسال + socket realtime + مرفقات | ✅ 🔨socket.io client + مرفقات عند J |
| 14 | **web-push (token register عبر BFF) + deep-links** | ✅ |
| 15 | عائلة: كتابة (إضافة/دعوة/صلاحيات/حذف) + member-scoped booking | ✅ (dfa5ae5) |
| 16 | صحة: تسجيل vitals/sleep/mood كتابة + trends تفاعلي | ✅ كتابة (ba6b56d) 🔨trends تفاعلي بعد اعتمادية رسم |
| 17 | حمل: hub/setup/kicks/contractions/growth | ✅ (97dc87a) |
| 18 | تغذية: profile/meals/water/daily-tracker/body-target | ✅ (ec403f7) 🔨weekly-report عرض لاحقًا |
| 19 | نفسية: mood كتابة + breathing/meditation جلسات | ✅ (4bf0786 + mood ضمن ba6b56d) |
| 20 | AI: مساعد/triage/skin-analysis/مترجم وصفات/monthly-report | ✅ triage+ocr-translate+skin (3dde1e7) 🔨monthly-report يحتاج endpoint باكند |
| 21 | drug-scanner (باركود+تفاعلات) | ✅ إدخال يدوي (17e22bc) 🔨كاميرا جوال فقط |
| 22 | ولاء: hub/rewards/challenges/leaderboard/referrals | ✅ (0092458) |
| 23 | عروض: index/detail (+redeem حسب D-021) | ✅ index/detail (f785924 + GET /offers جديد) 🔨redeem مخصص معلّق على قرار D-021 |
| 24 | خريطة مزودين + فلترة | ✅ قائمة+فلاتر (32064fc) 🔨خريطة تفاعلية كاملة جوال-first |
| 25 | دعم: تذاكر إنشاء/تفاصيل + شات دعم | ✅ تذاكر (2c62cca) 🔨شات الدعم الحي عبر شات #13 |
| 26 | إرجاع: hub/new-request/detail | ✅ (c0cfbcb) |
| 27 | مراجعات: كتابة تقييم بعد الخدمة | ✅ (da5e5f9) |
| 28 | إعدادات: تعديل profile/لغة متزامنة/إشعارات prefs/security re-auth | ✅ profile+locale+prefs (aaef7da) 🔨re-auth كلمة مرور/2FA مسار أمني منفصل |
| 29 | برامج علاجية active + إكمال جلسة | ✅ (1d802f4) |
| 30 | طوارئ SOS + تتبع | ✅ trigger/cancel/active (a57a1f0) 🔨تتبع الخريطة الحي جوال |
| 31 | مجتمع: نشر/تصويت/تعليق | ✅ (c0b000a) |
| 32 | wearables إدخال يدوي | ✅ (c863f24) |
| 33 | drug-compare/filters/بحث متقدم | ✅ (8a34ad0) |

**الإجمالي المتبقي ≈ 19–21 يوم مهندس ويب** بعد ما أُنجز. كل بند يُنفَّذ بنمط BFF الموحد (zod+CSRF+idempotency) وبوابة تحقق لكل مجموعة قبل الانتقال.

## ✅ بوابة الجودة والأمن (جلسة الإكمال)
- **TypeScript:** `tsc --noEmit` أخضر 100% على backend وpatient-web (بعد تثبيت الاعتماديات فعليًا). أُصلح: صفحة عروض صيدلية معطوبة JSX، استيراد cookies ناقص في session route، تضييق أنواع discriminated unions في ai/drug-scanner، zod v4 record/partial، BufferSource في push-enable.
- **الاختبارات:** ويب 255/255 ✓ (131 ملف) — باكند 472/472 ✓. أُصلح: DI الاتصال في labs spec، mock سجل الحجز لـ RefundService (F-C6)، مهلتي bcrypt في auth specs تحت التوازي.
- **تعارضات سياسة قديمة حُسمت لصالح I-wave1:** proxy/seo/catalog tests حدّثت لتؤكد فهرسة medicine-catalog/specialties/articles مع بقاء noindex على الخاص؛ حذف express5 template test الميت (لا server/_core).
- **أمن:** تدقيق شامل لكل مسارات BFF — CSRF+auth+zod+idempotency على كل الكتابات (جدول grep موثق). إصلاحان: /api/bookings يفرض idempotency (header أو hidden field للنماذج) و/medicines/compare أصبح same-origin gated. فحص تسريب توكنات SSR نظيف. إصلاح ثغرة إنتاجية كشفها الاختبار: فرع التأمين كان يعيد 502 لأن resultSchema رفض حالة pending للمواعيد المؤمّنة.
- **حدود خصوصية:** استخراج الشات انقسم (قائمة صارمة بلا body / thread detail لأطرافه فقط)؛ لوحة العائلة تجلب معرّفات الأفراد post-mount حتى لا تظهر في SSR HTML.

## ✅ دفعة الإكمال النهائي (9502dd5 → c1c14cb)
- **#13 اكتمل فعليًا** d53092e: socket.io client (chat_rt handshake + تجديد 9د + join_thread) — رسائل الأقران تصل لحظيًا وrefresh يجلبها من REST؛ المرفقات end-to-end: BFF multipart → /media/upload (purpose=chat مربوط بالـthread upstream) → media_ids في الإرسال → التسليم عبر /media/:id/url لأطراف الـthread فقط. CSP أضيف لها wss://api.nabd.plus. **والباكند:** gateway يبث REST messages إلى نفس الغرفة (توحيد العقار لكل العملاء).
- **#28 اكتمل** 2af681b: تغيير كلمة المرور بتحقق bcrypt من الحالية upstream + toggles للتحقق بخطوتين/الحيوية.
- **#20/I اكتمل** 9502dd5 + 65cb86e: endpoint GET /health/monthly-report?month=YYYY-MM (تجميع حقيقي JS-side يتجنب $toDouble على قيم الضغط "sys/dia") + صفحة ويب بتنقّل شهري + sparkline SVG من القراءات الحقيقية (بلا مكتبة رسم).
- **G اكتمل** c1c14cb: quote نقاط الولاء لهذا الطلب على صفحة الدفع (EPIC S12، سيرفري).
- البوابات: TSC صفر بالتطبيقين، ويب 255/255، باكند health suite أخضر، ZERO-MOCK نظيف على كل ملف جديد.

## ⏭️ المتبقي الوحيد (خارج سلطة هذه الجلسة)
1. **redeem مخصص لكل عرض** — قرار D-021 غير مسجل في أي وثيقة؛ الاستبدال يعمل اليوم عبر نقاط الولاء عند الدفع (quote حي + settle upstream). لا يصح اختراع قرار.
2. **تشغيل e2e/k6 على staging** — بوابة J كما هي مخططة.


---

# ✅ PROVIDER PRODUCTION PLAN — P1→P9 منفذة (بوابات خضراء)

**الفرع:** `release/patient-production` — التطبيق: `extracted/provider` ( symlink: `workstation/provider` )

| المرحلة | المحتوى | البوابة |
|---|---|---|
| **P1** | إزالة ~70 mock: demo patients/wallet seeds/rx templates/POL-MEM random/NPHIES الإجباري/debug alerts/EHR hardcoded/fake video→VideoCallRoom حقيقي/push register موصول/ambulance route مفتوح/catalogs بلا fallback وهمي | grep نظيف + tsc ✓ |
| **P2** | عقود الأنواع السبعة (consultation/lab-sample/nursing-visit/radiology-report/claims/ambulance) + DTOs الـ9 endpoints + assertProviderTransition | jest 7/7 ✓ |
| **P3** | الوحدات الحاكمة: `/orders/:id/insurance-decision` + coverage-decision ×3 + `/provider/crm/:patientId` + `/provider/referrals/mine` + technicians roster CRUD + claims actions + `/provider/reports/inbound` + availability round-trip + shifts PATCH/DELETE | e2e 13/13 ✓ |
| **P4** | صيدلية: قرار تأمين per-item (عقد P4) على محرك v2 + تسوية COD عند delivery + تسعير العروض سيرفريًا من inventory + schema payment mirrors (إصلاح strict-mode drop) + فك تعارض route /insurance بين النظامين | e2e 8/8 ✓ |
| **P5-P7** | مختبر: barcode chain→REPORTED+TAT • أشعة: coverage→checkin→scan→review→publish • تمريض: geofence 500m+vitals+signature حقيقية • إسعاف: dispatch→track→handover→complete+ledger | e2e 9/9 ✓ |
| **P9** | runner موحّد `e2e/run-all-gates.js`: contracts(7)+app-contracts+ZERO-MOCK(14)+e2e(13/8/9) | ★★★ GO ★★★ |

## 🔧 إصلاحات بنيوية اكتُشفت أثناء البوابات
1. `hospital-staff`: قراءة `parent_provider_account_id` بينما الكتابة `parent_account_id` → فك ارتباط المالك كله؛ + توليد كلمة مرور مؤقتة سيرفريًا.
2. `PharmacyOrder` schema: حقول payment_method/payment_status كانت غائبة → mongoose strict يسقطها صامتة (COD وهمي).
3. تعارض مسار `/provider/pharmacy/orders/:id/insurance` بين legacy وv2 → legacy يفوض per-item للـ v2.
4. تسعير العروض: i-have-all كان بلا unit_price → الآن سيرفري من inventory (العقد الحاكم).
5. radiology insurance_status enum لا يعرف partial_approval → مرآة kind-aware.

## ⚠️ ملاحظات تشغيلية
- وكيل متوازٍ التقط ملفات P4 داخل commit `c92a03b docs:` (رسالة مضللة، المحتوى سليم).
- بيئة e2e بلا S3/R2: تقارير الأشعة تستخدم backend base64 عبر storage_objects مباشرة (نفس شكل /storage/upload).
- تشغيل البوابات: build ثم mongo:27077+redis:6388+server:4099 ثم `node e2e/run-all-gates.js`.
