# خريطة آثار البناء المرصودة في commits لـ workstation

> **منهج الإثبات:** قرئت Git metadata وفروق النص فقط، من دون تثبيت أو تنفيذ أو استيراد كود workstation. عنوان commit أدناه **ادعاء مؤلفه**؛ أما ما يثبت هنا فهو فقط الملفات التي تغيّرت وعدد الأسطر وآثار البناء الساكنة. لا يعني ذلك أن التدفق يعمل أو أنه مصرح أو آمن أو جاهز للإنتاج.

يغطي التقرير **77 commit** بعد seed `4194495`. يظل Provider خارج نطاق التحقق لأن `provider` رابط رمزي إلى مصدر غير موجود في الأرشيف.

| # | Commit | ادعاء العنوان | آثار المصدر الملاحظة | Δ أسطر (+/−) | الحكم الساكن |
|---:|---|---|---|---:|---|
| 1 | `bcbfcbf` | feat(A): decisions locked + shared-contracts state machines + CI skeleton | عقود/حزم مشتركة، CI أو إعداد نشر، توثيق | 267/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 2 | `612c84a` | fix(B): close 20 critical security holes across backend/mobile/web | مسارات BFF/API، شاشات/تدفقات mobile، مصدر backend | 478/63 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 3 | `2610216` | feat(C): pharmacy governing-rules engine (PH-PHARMACY) | شاشات/تدفقات mobile، مصدر backend | 447/27 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 4 | `151dbef` | feat(C3): patient-web pharmacy governing-rules flow | مسارات BFF/API، صفحات ويب | 286/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 5 | `b0bd5ef` | feat(D): consultations insurance branch per PH-SERVICE governing rules | مصدر backend | 35/6 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 6 | `fd61a09` | docs: execution handoff (done E-next map) | توثيق | 34/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 7 | `74826b3` | feat(E): labs/radiology booking funnel + unified coverage mirrors (PH-SERVICE) | شاشات/تدفقات mobile، مصدر backend | 228/2 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 8 | `42a52cc` | feat(E-web): labs/radiology/nursing web booking per PH-SERVICE | مسارات BFF/API، صفحات ويب | 144/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 9 | `6237429` | feat(F): family bookings verified, GDPR export live, data-rights buttons wired | شاشات/تدفقات mobile، مصدر backend | 52/7 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 10 | `5412d5c` | fix(J/X2): production compose actually boots now | مصدر backend، CI أو إعداد نشر | 40/6 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 11 | `43f13d5` | docs: handoff progress update | توثيق | 5/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 12 | `f24e344` | feat(H+J): root error boundary mounted, deep-link scheme unified (nabdplus), governing-rules e2e matrix (10 probes) | شاشات/تدفقات mobile، مصدر backend، ملفات اختبار | 94/6 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 13 | `2791d82` | docs: handoff H+J update | توثيق | 5/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 14 | `55659a8` | feat(G): wallet payment for selected pharmacy offer (atomic guarded debit) | مصدر backend | 43/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 15 | `55bc074` | fix(I/X12): root html lang+dir follow the active locale (was hardcoded ar/rtl) | صفحات ويب | 15/2 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 16 | `cd03ded` | docs: handoff G+I update | توثيق | 4/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 17 | `e492929` | feat(I): SEO unlock wave-1 — public catalog surfaces | صفحات ويب | 19/3 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 18 | `ade6865` | docs: handoff I-wave1 | توثيق | 3/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 19 | `c48c1bd` | docs: reconciliation-v2 (agent batch-2) + dedicated WEB PARITY track | مصدر backend، توثيق | 21/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 20 | `db2eb00` | fix(E): booking mirrors actually persist + member_id across labs/radiology/nursing | مصدر backend | 110/12 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 21 | `4f4cbec` | fix(E-mobile): nursing funnel follows the real PH-SERVICE paths | شاشات/تدفقات mobile | 40/34 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 22 | `670c276` | docs(F): exhaustive web-parity backlog (33 groups) appended to handoff | صفحات ويب، توثيق | 137/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 23 | `b64adc9` | docs: ZERO-MOCK enforcement rule for all remaining builds | مسارات BFF/API، صفحات ويب، توثيق | 16/56 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 24 | `9f278b1` | feat(E-web): nursing booking page + BFF payload fix for /home-care/bookings | صفحات ويب | 9/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 25 | `2c6c7e9` | docs: handoff E-completion batch (db2eb00, 4f4cbec, 9f278b1) | توثيق | 6/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 26 | `4990f6e` | feat(D): unified consultation contract accepts payment_method=insurance | مصدر backend | 7/3 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 27 | `0535f68` | feat(D-web): consultation insurance branch + copay settlement page (parity #11) | مسارات BFF/API، صفحات ويب، ملفات اختبار | 336/7 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 28 | `6aa7f3f` | docs: provider production plan + admin enterprise plan (standalone sessions) | مسارات BFF/API، صفحات ويب، توثيق | 282/15 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 29 | `3f3c288` | docs: WEB PARITY batch-1 record (parity #11 + #12) and agent-collision warning | توثيق | 5/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 30 | `97fb686` | docs: ready-to-paste kickoff messages for the 3 execution sessions | مسارات BFF/API، صفحات ويب، CI أو إعداد نشر، توثيق | 207/2 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 31 | `6036135` | feat(H-web): chat composer + read receipts + live transcript refresh (parity #13) | صفحات ويب، CI أو إعداد نشر | 37/3 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 32 | `9ecbe8c` | feat(H-web): web-push enable + notification deep-links (parity #14) | مسارات BFF/API، صفحات ويب | 214/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 33 | `5bd4ded` | docs: WEB PARITY batch-2 (chat #13 + web-push #14) recorded, backlog updated | توثيق | 13/7 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 34 | `dfa5ae5` | feat(F-web): family write ops + member-scoped booking (parity #15) | مسارات BFF/API، صفحات ويب | 357/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 35 | `ba6b56d` | feat(F-web): vitals/sleep/mood logging on web (parity #16) | مسارات BFF/API، صفحات ويب | 240/3 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 36 | `97dc87a` | feat(F-web): maternity hub with real logging (parity #17) | مسارات BFF/API، صفحات ويب | 218/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 37 | `ec403f7` | feat(F-web): nutrition hub — meals/water/profile targets (parity #18) | صفحات ويب | 140/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 38 | `4bf0786` | feat(F-web): breathing/meditation session logging (parity #19) | مسارات BFF/API، صفحات ويب | 147/2 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 39 | `3dde1e7` | feat(F-web): AI tools hub — triage, prescription translation, skin self-check (parity #20) | مسارات BFF/API، صفحات ويب | 245/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 40 | `17e22bc` | feat(F-web): drug scanner — barcode lookup + interactions (parity #21) | مسارات BFF/API، صفحات ويب | 137/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 41 | `0092458` | feat(F-web): loyalty hub — rewards/challenges/leaderboard/referral (parity #22) | مسارات BFF/API، صفحات ويب | 158/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 42 | `f785924` | feat(F-web): offers index/detail + patient offers list endpoint (parity #23) | صفحات ويب، مصدر backend | 128/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 43 | `32064fc` | feat(F-web): providers map list + filters (parity #24) | صفحات ويب | 99/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 44 | `2c62cca` | feat(F-web): support tickets — create, list, thread + reply (parity #25) | مسارات BFF/API، صفحات ويب | 216/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 45 | `c0cfbcb` | feat(F-web): returns hub — refund request + my refunds (parity #26) | مسارات BFF/API، صفحات ويب | 156/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 46 | `da5e5f9` | feat(F-web): post-service review form (parity #27) | مسارات BFF/API، صفحات ويب | 141/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 47 | `3e9f8e9` | feat(A1): security foundation — role hierarchy (super_admin⊇admin), dynamic RBAC, real disputes engine, shared audit service, reason enforcement | مصدر backend، ملفات اختبار | 1868/13 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 48 | `aaef7da` | feat(F-web): settings edit — profile patch, language sync, notif prefs (parity #28) | مسارات BFF/API، صفحات ويب | 216/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 49 | `1d802f4` | feat(F-web): treatment programs — enroll + complete session (parity #29) | مسارات BFF/API، صفحات ويب | 154/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 50 | `a57a1f0` | feat(F-web): emergency SOS trigger/cancel + active check (parity #30) | مسارات BFF/API، صفحات ويب | 195/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 51 | `c0b000a` | feat(F-web): community — post/vote/comment (parity #31) | مسارات BFF/API، صفحات ويب، CI أو إعداد نشر | 248/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 52 | `c863f24` | feat(F-web): wearables manual entry (parity #32) | مسارات BFF/API، صفحات ويب | 147/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 53 | `8a34ad0` | feat(F-web): drug compare + advanced search (parity #33) | مسارات BFF/API، صفحات ويب | 204/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 54 | `106ca95` | docs: WEB PARITY batch-3 — backlog 15-33 complete, table + explicit remainders | توثيق | 43/19 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 55 | `3f319d0` | fix(P1): server-side temp credentials + ownership field fix in hospital-staff (parent_account_id read bug) | مصدر backend | 34/10 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 56 | `20c6f2b` | feat(A7): command center v2 SSE controller + scheduled reports runner (cron, real aggregation compute, CSV attachment email via Resend/SES, run history) | مصدر backend، عقود/حزم مشتركة، ملفات اختبار | 2009/11 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 57 | `d537e9a` | feat(P2): provider contracts for 7 verticals + 9 governed endpoint DTOs + transition guard (7 unit gates green) | عقود/حزم مشتركة، ملفات اختبار | 94/4 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 58 | `4278728` | fix(audit round): 5 real defects found on self-review | مصدر backend | 86/11 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 59 | `143c98d` | feat(P3): 9 governed provider endpoints (insurance-decision, coverage-decision x3, CRM, referrals/mine, technicians roster, claims actions, reports/inbound, availability round-trip) + shifts PATCH/DELETE — e2e gate 13/13 on live server | مصدر backend، ملفات اختبار | 869/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 60 | `f10ea7f` | fix(J-review): hospital-staff ownership write path (strict-mode strip re-broke access) + review verdict with 5 mandatory follow-ups | مسارات BFF/API، صفحات ويب، مصدر backend، ملفات اختبار، توثيق | 1763/42 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 61 | `7030535` | test(enterprise): REAL integration gate 18/18 — boots AdminEnterpriseModule on in-memory Mongo, probes A1→A7 over HTTP | مصدر backend، ملفات اختبار | 216/58 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 62 | `265a133` | feat(segments): dynamic audiences (plan E) — pure DSL→Mongo compiler with privacy fence, preview/count/members endpoints, audit; 6/6 unit tests | مصدر backend، ملفات اختبار | 280/4 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 63 | `5ab5bee` | fix(web-security): bookings BFF idempotency + compare route CSRF gate | مسارات BFF/API، صفحات ويب | 16/7 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 64 | `91cf09a` | test(web): align suites with fail-closed CSRF and I-wave1 indexing policy | ملفات اختبار | 31/14 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 65 | `3b5218f` | docs: quality+security gate results — tsc/tests green both apps, audit fixes, explicit remaining decisions | توثيق | 14/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 66 | `c92a03b` | docs: admin session review verdict — approved, 4 GO-gate items remain | مسارات BFF/API، مصدر backend، ملفات اختبار، توثيق | 317/22 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 67 | `c977233` | feat(go-gate#3): wire seo_controls into robots()/sitemap() — blocked entity types vanish from sitemap and get explicit Disallow lines | مصدر backend، ملفات اختبار، توثيق | 166/12 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 68 | `9502dd5` | feat(H+20): REST chat fanout to WS room + monthly health report endpoint | مصدر backend | 87/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 69 | `d53092e` | feat(H-web): chat realtime via socket.io + attachments end-to-end (parity #13 complete) | مسارات BFF/API، صفحات ويب، CI أو إعداد نشر | 335/28 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 70 | `2af681b` | feat(F-web): security re-auth — password rotation + 2FA toggles (parity #28 complete) | مسارات BFF/API، صفحات ويب | 152/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 71 | `65cb86e` | feat(I-web): monthly report page + trends sparklines (parity #20/I completion) | صفحات ويب | 134/8 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 72 | `7ba7501` | feat(P5-P7): vertical lifecycle gate 9/9 — lab sample chain→REPORTED+TAT, radiology coverage/report-phases with enum-valid mirror + secure storage, nursing geofence visit chain, ambulance dispatch→ledger; fixes radiology partial-approval mirror enum | مصدر backend، ملفات اختبار | 272/3 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 73 | `c1c14cb` | feat(G-web): server loyalty redeem-quote on pharmacy pay (G completion) | صفحات ويب | 17/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 74 | `a56321c` | docs: completion batch recorded — parity #13/#28/#20/G fully closed; remaining = owner decision + gate J | توثيق | 11/36 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 75 | `0c97a2a` | feat(P9): master gate runner — GO verdict across contracts(7), ZERO-MOCK+app-contracts(14), e2e P3(13)/P4(8)/P5-P7(9) | مصدر backend، ملفات اختبار | 53/0 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |
| 76 | `109fd89` | docs: PROVIDER_PRODUCTION_PLAN P1-P9 execution record — all gates green, structural fixes, run instructions | توثيق | 27/0 | توثيق فقط؛ لا يثبت بناء وظيفة |
| 77 | `51a84c7` | feat(go-gate#2): mail smoke tool — one command proves key+domain+CSV attachment over the production Resend→SES path | مصدر backend، توثيق | 93/1 | آثار مصدر ملاحظة؛ غير متحقق وقت التشغيل |

# تفاصيل الملفات لكل commit

## 1. `bcbfcbf8a5ec7a31a62ffab465813b760d5bbbfd`

**ادعاء العنوان:** feat(A): decisions locked + shared-contracts state machines + CI skeleton

**الأثر المرصود:** عقود/حزم مشتركة، CI أو إعداد نشر، توثيق. تغير `5` ملفاً، بإجمالي `267` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `.github/workflows/ci.yml` |
| `A` | `DECISIONS_LOCKED.md` |
| `A` | `packages/shared-contracts/package.json` |
| `A` | `packages/shared-contracts/src/index.ts` |
| `A` | `packages/shared-contracts/src/state-machines.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 2. `612c84a0d764c6f3636bd874cd194e509bfbea67`

**ادعاء العنوان:** fix(B): close 20 critical security holes across backend/mobile/web

**الأثر المرصود:** مسارات BFF/API، شاشات/تدفقات mobile، مصدر backend. تغير `28` ملفاً، بإجمالي `478` إضافة و`63` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/care/appointments.service.ts` |
| `M` | `backend/src/modules/chat/chat.gateway.ts` |
| `M` | `backend/src/modules/insurance-engine/insurance-engine.module.ts` |
| `M` | `backend/src/modules/moyasar/moyasar.module.ts` |
| `M` | `backend/src/modules/nabd-extensions/nabd-extensions.controller.ts` |
| `M` | `backend/src/modules/payments/paymob.controller.ts` |
| `M` | `backend/src/modules/payments/paymob.service.ts` |
| `M` | `backend/src/modules/provider-ops/provider-ops.module.ts` |
| `M` | `backend/src/modules/unified-bookings/unified-bookings.module.ts` |
| `M` | `backend/src/modules/unified-bookings/unified-bookings.service.ts` |
| `M` | `backend/src/schemas/slot-lock.schema.ts` |
| `M` | `patient-mobile/app/(auth)/otp.tsx` |
| `M` | `patient-mobile/app/payments/success.tsx` |
| `M` | `patient-mobile/app/settings/index.tsx` |
| `M` | `patient-mobile/src/utils/api.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/cancel/route.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts` |
| `M` | `patient-web/app/api/appointments/book/route.ts` |
| `M` | `patient-web/app/api/auth/login/route.ts` |
| `M` | `patient-web/app/api/auth/logout/route.ts` |
| `M` | `patient-web/app/api/auth/otp/request/route.ts` |
| `M` | `patient-web/app/api/auth/otp/verify/route.ts` |
| `M` | `patient-web/app/api/auth/session/exchange/route.ts` |
| `M` | `patient-web/app/api/auth/session/route.ts` |
| `M` | `patient-web/app/api/auth/verify-2fa/route.ts` |
| `A` | `patient-web/lib/api/csrf.ts` |
| `M` | `patient-web/proxy.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 3. `26102163a5fa07b73a0a4d5518932515e9e4535a`

**ادعاء العنوان:** feat(C): pharmacy governing-rules engine (PH-PHARMACY)

**الأثر المرصود:** شاشات/تدفقات mobile، مصدر backend. تغير `8` ملفاً، بإجمالي `447` إضافة و`27` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/payments/payments.module.ts` |
| `M` | `backend/src/modules/pharmacy/pharmacy.controllers.ts` |
| `M` | `backend/src/modules/pharmacy/schemas/pharmacy.schema.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-broadcast.service.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-order.service.ts` |
| `M` | `patient-mobile/app/pharmacy/checkout.tsx` |
| `A` | `patient-mobile/app/pharmacy/offers.tsx` |
| `M` | `patient-mobile/app/pharmacy/payment.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 4. `151dbef261a7ecce00749595744467d6b1b1180c`

**ادعاء العنوان:** feat(C3): patient-web pharmacy governing-rules flow

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `8` ملفاً، بإجمالي `286` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/pharmacy/offers/page.tsx` |
| `A` | `patient-web/app/[locale]/pharmacy/pay/page.tsx` |
| `A` | `patient-web/app/[locale]/pharmacy/select/page.tsx` |
| `A` | `patient-web/app/api/pharmacy/orders/[orderId]/cod/route.ts` |
| `A` | `patient-web/app/api/pharmacy/orders/[orderId]/offers/route.ts` |
| `A` | `patient-web/app/api/pharmacy/orders/[orderId]/select-offer/route.ts` |
| `A` | `patient-web/app/api/pharmacy/orders/route.ts` |
| `A` | `patient-web/lib/api/pharmacy-flow.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 5. `b0bd5efb7f66de099888fd13e950c067eec34481`

**ادعاء العنوان:** feat(D): consultations insurance branch per PH-SERVICE governing rules

**الأثر المرصود:** مصدر backend. تغير `3` ملفاً، بإجمالي `35` إضافة و`6` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/care/appointments.service.ts` |
| `M` | `backend/src/modules/insurance-engine/insurance-engine.module.ts` |
| `M` | `backend/src/schemas/appointment.schema.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 6. `fd61a0961d88d36251b13cd0b3d9f53a8b6c0464`

**ادعاء العنوان:** docs: execution handoff (done E-next map)

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `34` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 7. `74826b3ee6074ea08aa168c386f00fadea61965e`

**ادعاء العنوان:** feat(E): labs/radiology booking funnel + unified coverage mirrors (PH-SERVICE)

**الأثر المرصود:** شاشات/تدفقات mobile، مصدر backend. تغير `4` ملفاً، بإجمالي `228` إضافة و`2` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/insurance-engine/insurance-engine.module.ts` |
| `A` | `patient-mobile/app/diagnostics/book.tsx` |
| `M` | `patient-mobile/app/diagnostics/package-detail.tsx` |
| `M` | `patient-mobile/app/diagnostics/test-detail.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 8. `42a52cccb14e3cdec10ba8913425acb31adc70e2`

**ادعاء العنوان:** feat(E-web): labs/radiology/nursing web booking per PH-SERVICE

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `2` ملفاً، بإجمالي `144` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/labs/book/page.tsx` |
| `A` | `patient-web/app/api/bookings/[kind]/route.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 9. `623742942ed1355abc7683517bbc9827d5d704d8`

**ادعاء العنوان:** feat(F): family bookings verified, GDPR export live, data-rights buttons wired

**الأثر المرصود:** شاشات/تدفقات mobile، مصدر backend. تغير `4` ملفاً، بإجمالي `52` إضافة و`7` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/care/appointments.service.ts` |
| `M` | `backend/src/modules/users/users.controller.ts` |
| `M` | `backend/src/schemas/appointment.schema.ts` |
| `M` | `patient-mobile/app/settings/data.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 10. `5412d5ca2b7eed166c196292aa42610458ba9e21`

**ادعاء العنوان:** fix(J/X2): production compose actually boots now

**الأثر المرصود:** مصدر backend، CI أو إعداد نشر. تغير `1` ملفاً، بإجمالي `40` إضافة و`6` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/docker-compose.prod.yml` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 11. `43f13d544240ed206b3f890ad76b54ecadd7728b`

**ادعاء العنوان:** docs: handoff progress update

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `5` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 12. `f24e34446e9d16f6fa5d2f2541d0b7b36468485e`

**ادعاء العنوان:** feat(H+J): root error boundary mounted, deep-link scheme unified (nabdplus), governing-rules e2e matrix (10 probes)

**الأثر المرصود:** شاشات/تدفقات mobile، مصدر backend، ملفات اختبار. تغير `4` ملفاً، بإجمالي `94` إضافة و`6` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/e2e/governing-rules.js` |
| `M` | `patient-mobile/app/_layout.tsx` |
| `M` | `patient-mobile/src/config/deepLinks.ts` |
| `M` | `patient-mobile/src/theme/index.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 13. `2791d8241e73bedd741cc7b19f7c1bf15ee77ffd`

**ادعاء العنوان:** docs: handoff H+J update

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `5` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 14. `55659a822200b80fbe5376038db2662e8184df98`

**ادعاء العنوان:** feat(G): wallet payment for selected pharmacy offer (atomic guarded debit)

**الأثر المرصود:** مصدر backend. تغير `2` ملفاً، بإجمالي `43` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/pharmacy/pharmacy.controllers.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-order.service.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 15. `55bc0742e1f4cea5982685154dc0e82999ad759e`

**ادعاء العنوان:** fix(I/X12): root html lang+dir follow the active locale (was hardcoded ar/rtl)

**الأثر المرصود:** صفحات ويب. تغير `1` ملفاً، بإجمالي `15` إضافة و`2` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/layout.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 16. `cd03ded083adfcccf9cbdeec7ac7c50ef0f0daa8`

**ادعاء العنوان:** docs: handoff G+I update

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `4` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 17. `e4929291554fe8f7483a4325fc149d641543ea97`

**ادعاء العنوان:** feat(I): SEO unlock wave-1 — public catalog surfaces

**الأثر المرصود:** صفحات ويب. تغير `4` ملفاً، بإجمالي `19` إضافة و`3` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/medicine-catalog/page.tsx` |
| `M` | `patient-web/app/robots.ts` |
| `M` | `patient-web/app/sitemap.ts` |
| `M` | `patient-web/proxy.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 18. `ade6865fafab82fb027a3397945616ea6e54b1d3`

**ادعاء العنوان:** docs: handoff I-wave1

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `3` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 19. `c48c1bd3acb2ac32107d12eac9ee5882056dfd86`

**ادعاء العنوان:** docs: reconciliation-v2 (agent batch-2) + dedicated WEB PARITY track

**الأثر المرصود:** مصدر backend، توثيق. تغير `2` ملفاً، بإجمالي `21` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |
| `M` | `backend/src/schemas/lab.schema.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 20. `db2eb00478b464fa87df6433dcf4c2bec45fe89c`

**ادعاء العنوان:** fix(E): booking mirrors actually persist + member_id across labs/radiology/nursing

**الأثر المرصود:** مصدر backend. تغير `6` ملفاً، بإجمالي `110` إضافة و`12` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/home-care-compat/home-care-compat.module.ts` |
| `M` | `backend/src/modules/insurance-engine/insurance-engine.module.ts` |
| `M` | `backend/src/modules/labs/labs.service.ts` |
| `M` | `backend/src/modules/radiology/radiology.service.ts` |
| `M` | `backend/src/schemas/home-care.schema.ts` |
| `M` | `backend/src/schemas/radiology.schema.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 21. `4f4cbec39f9971c7f28c541309c9317a28e063be`

**ادعاء العنوان:** fix(E-mobile): nursing funnel follows the real PH-SERVICE paths

**الأثر المرصود:** شاشات/تدفقات mobile. تغير `1` ملفاً، بإجمالي `40` إضافة و`34` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-mobile/app/nursing/nurse-profile.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 22. `670c276d3eb3427a13ea438d495af6f647e0a9e5`

**ادعاء العنوان:** docs(F): exhaustive web-parity backlog (33 groups) appended to handoff

**الأثر المرصود:** صفحات ويب، توثيق. تغير `3` ملفاً، بإجمالي `137` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |
| `A` | `patient-web/app/[locale]/home-care/book/page.tsx` |
| `A` | `patient-web/components-next/service-booking-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 23. `b64adc9b428bad13ade1b0941fb11d7db69131d6`

**ادعاء العنوان:** docs: ZERO-MOCK enforcement rule for all remaining builds

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، توثيق. تغير `3` ملفاً، بإجمالي `16` إضافة و`56` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |
| `M` | `patient-web/app/[locale]/labs/book/page.tsx` |
| `M` | `patient-web/app/api/bookings/[kind]/route.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 24. `9f278b167a42f4d083151eebab1cce211d0ac5bf`

**ادعاء العنوان:** feat(E-web): nursing booking page + BFF payload fix for /home-care/bookings

**الأثر المرصود:** صفحات ويب. تغير `1` ملفاً، بإجمالي `9` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/components-next/service-booking-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 25. `2c6c7e9676bf3ef8810432f12bf69b9909beeaf7`

**ادعاء العنوان:** docs: handoff E-completion batch (db2eb00, 4f4cbec, 9f278b1)

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `6` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 26. `4990f6ea7281539b2ac6c66aa0cfb6968781eda2`

**ادعاء العنوان:** feat(D): unified consultation contract accepts payment_method=insurance

**الأثر المرصود:** مصدر backend. تغير `1` ملفاً، بإجمالي `7` إضافة و`3` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/unified-bookings/unified-bookings.module.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 27. `0535f68d575099e01b857110e951fca11de2cf2e`

**ادعاء العنوان:** feat(D-web): consultation insurance branch + copay settlement page (parity #11)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، ملفات اختبار. تغير `8` ملفاً، بإجمالي `336` إضافة و`7` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/insurance/page.tsx` |
| `A` | `patient-web/app/[locale]/insurance/requests/[requestId]/page.tsx` |
| `M` | `patient-web/app/api/appointments/book/route.test.ts` |
| `M` | `patient-web/app/api/appointments/book/route.ts` |
| `A` | `patient-web/app/api/insurance/requests/[requestId]/pay-copay/route.ts` |
| `A` | `patient-web/app/api/insurance/requests/[requestId]/payment-intent/route.ts` |
| `M` | `patient-web/components-next/appointment-booking-form.tsx` |
| `A` | `patient-web/components-next/insurance-copay-actions.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 28. `6aa7f3f70ff03653412a0269a96728304bc89ba9`

**ادعاء العنوان:** docs: provider production plan + admin enterprise plan (standalone sessions)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، توثيق. تغير `6` ملفاً، بإجمالي `282` إضافة و`15` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `ADMIN_ENTERPRISE_PLAN.md` |
| `M` | `HANDOFF.md` |
| `A` | `PROVIDER_PRODUCTION_PLAN.md` |
| `M` | `patient-web/app/[locale]/pharmacy/pay/page.tsx` |
| `A` | `patient-web/app/api/pharmacy/orders/[orderId]/pay-wallet/route.ts` |
| `A` | `patient-web/app/api/pharmacy/orders/[orderId]/payment-intent/route.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 29. `3f3c288f52639c13b36d5a00e15393f6ec700fc7`

**ادعاء العنوان:** docs: WEB PARITY batch-1 record (parity #11 + #12) and agent-collision warning

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `5` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 30. `97fb686b5b65dd9472480ccd5a4092dfc95f8386`

**ادعاء العنوان:** docs: ready-to-paste kickoff messages for the 3 execution sessions

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، CI أو إعداد نشر، توثيق. تغير `5` ملفاً، بإجمالي `207` إضافة و`2` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `SESSION_KICKOFF_MESSAGES.md` |
| `A` | `patient-web/app/api/chat/threads/[threadId]/messages/route.ts` |
| `A` | `patient-web/app/api/chat/threads/[threadId]/read/route.ts` |
| `A` | `patient-web/components-next/chat-composer.tsx` |
| `M` | `patient-web/lib/api/chat.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 31. `6036135a35390d3ca4ef9f691dfd7a2af4b941ba`

**ادعاء العنوان:** feat(H-web): chat composer + read receipts + live transcript refresh (parity #13)

**الأثر المرصود:** صفحات ويب، CI أو إعداد نشر. تغير `2` ملفاً، بإجمالي `37` إضافة و`3` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/chat/[threadId]/page.tsx` |
| `M` | `patient-web/components-next/chat-composer.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 32. `9ecbe8c7559ff69bb8a5d5d6624cfa442b572a39`

**ادعاء العنوان:** feat(H-web): web-push enable + notification deep-links (parity #14)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `6` ملفاً، بإجمالي `214` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/notifications/page.tsx` |
| `A` | `patient-web/app/api/push/subscribe/route.ts` |
| `A` | `patient-web/app/api/push/unsubscribe/route.ts` |
| `A` | `patient-web/app/api/push/vapid-key/route.ts` |
| `A` | `patient-web/components-next/push-enable.tsx` |
| `A` | `patient-web/public/sw.js` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 33. `5bd4ded9868b4e962a7870158e97e649ef390582`

**ادعاء العنوان:** docs: WEB PARITY batch-2 (chat #13 + web-push #14) recorded, backlog updated

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `13` إضافة و`7` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 34. `dfa5ae54e095bcba83373c14dfaed1e0f102895b`

**ادعاء العنوان:** feat(F-web): family write ops + member-scoped booking (parity #15)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `10` ملفاً، بإجمالي `357` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/family/page.tsx` |
| `M` | `patient-web/app/api/bookings/[kind]/route.ts` |
| `A` | `patient-web/app/api/family/create/route.ts` |
| `A` | `patient-web/app/api/family/invite/route.ts` |
| `A` | `patient-web/app/api/family/join/route.ts` |
| `A` | `patient-web/app/api/family/leave/route.ts` |
| `A` | `patient-web/app/api/family/members/[memberId]/permissions/route.ts` |
| `A` | `patient-web/app/api/family/members/[memberId]/route.ts` |
| `A` | `patient-web/components-next/family-manage-panel.tsx` |
| `M` | `patient-web/components-next/service-booking-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 35. `ba6b56d59536490346b197c7826731f743d8db95`

**ادعاء العنوان:** feat(F-web): vitals/sleep/mood logging on web (parity #16)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `7` ملفاً، بإجمالي `240` إضافة و`3` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/health/sleep/page.tsx` |
| `M` | `patient-web/app/[locale]/health/vitals/page.tsx` |
| `M` | `patient-web/app/[locale]/mental-health/mood/page.tsx` |
| `A` | `patient-web/app/api/health/sleep/route.ts` |
| `A` | `patient-web/app/api/health/vitals/route.ts` |
| `A` | `patient-web/app/api/mental-health/mood/route.ts` |
| `A` | `patient-web/components-next/health-log-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 36. `97dc87a2a1e0556775de78acfd42fb8a29b9351f`

**ادعاء العنوان:** feat(F-web): maternity hub with real logging (parity #17)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `218` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/maternity/page.tsx` |
| `A` | `patient-web/app/api/maternity/profile/route.ts` |
| `A` | `patient-web/components-next/maternity-forms.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 37. `ec403f70b8646383d7f70df7327748b612ef48cd`

**ادعاء العنوان:** feat(F-web): nutrition hub — meals/water/profile targets (parity #18)

**الأثر المرصود:** صفحات ويب. تغير `2` ملفاً، بإجمالي `140` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/nutrition/page.tsx` |
| `A` | `patient-web/components-next/nutrition-forms.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 38. `4bf0786ed275eee952e810d6f48b41a7ebd89c1c`

**ادعاء العنوان:** feat(F-web): breathing/meditation session logging (parity #19)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `4` ملفاً، بإجمالي `147` إضافة و`2` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/mental-health/breathing/page.tsx` |
| `M` | `patient-web/app/[locale]/mental-health/meditation/page.tsx` |
| `A` | `patient-web/app/api/mental-health/sessions/route.ts` |
| `A` | `patient-web/components-next/session-log-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 39. `3dde1e74aaf5f6b070e45d63aa787a6d367af998`

**ادعاء العنوان:** feat(F-web): AI tools hub — triage, prescription translation, skin self-check (parity #20)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `245` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/ai/page.tsx` |
| `A` | `patient-web/app/api/ai/route.ts` |
| `A` | `patient-web/components-next/ai-tools.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 40. `17e22bc8970f86ae8f0c8f6611434c65028a78fd`

**ادعاء العنوان:** feat(F-web): drug scanner — barcode lookup + interactions (parity #21)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `137` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/drug-scanner/page.tsx` |
| `A` | `patient-web/app/api/drug-scanner/route.ts` |
| `A` | `patient-web/components-next/drug-scanner-tools.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 41. `00924580292cb99ff7ba873dca09ed828155a03a`

**ادعاء العنوان:** feat(F-web): loyalty hub — rewards/challenges/leaderboard/referral (parity #22)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `158` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/loyalty/page.tsx` |
| `A` | `patient-web/app/api/loyalty/route.ts` |
| `A` | `patient-web/components-next/loyalty-actions.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 42. `f785924ec13cdd44e97f2e9345e91fc8c4fe4ce1`

**ادعاء العنوان:** feat(F-web): offers index/detail + patient offers list endpoint (parity #23)

**الأثر المرصود:** صفحات ويب، مصدر backend. تغير `3` ملفاً، بإجمالي `128` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/compat/compat.module.ts` |
| `A` | `patient-web/app/[locale]/offers/[offerId]/page.tsx` |
| `A` | `patient-web/app/[locale]/offers/page.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 43. `32064fcaf60a68b09cbecfb15f4d5f51729a635b`

**ادعاء العنوان:** feat(F-web): providers map list + filters (parity #24)

**الأثر المرصود:** صفحات ويب. تغير `1` ملفاً، بإجمالي `99` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/providers-map/page.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 44. `2c62cca6cd3c5e5e36fc16842aa993424ddb7e75`

**ادعاء العنوان:** feat(F-web): support tickets — create, list, thread + reply (parity #25)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `4` ملفاً، بإجمالي `216` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/support/[ticketId]/page.tsx` |
| `A` | `patient-web/app/[locale]/support/page.tsx` |
| `A` | `patient-web/app/api/support/[action]/route.ts` |
| `A` | `patient-web/components-next/support-forms.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 45. `c0cfbcbd4f958220b5681b15d4b0574d58936b09`

**ادعاء العنوان:** feat(F-web): returns hub — refund request + my refunds (parity #26)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `156` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/returns/page.tsx` |
| `A` | `patient-web/app/api/refunds/route.ts` |
| `A` | `patient-web/components-next/refund-request-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 46. `da5e5f9c47e20b39a9473596dd456a5a27ab8d4b`

**ادعاء العنوان:** feat(F-web): post-service review form (parity #27)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `141` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/reviews/page.tsx` |
| `A` | `patient-web/app/api/ratings/route.ts` |
| `A` | `patient-web/components-next/review-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 47. `3e9f8e9dd3dfd2973a02a4dfbca76bcb5027c355`

**ادعاء العنوان:** feat(A1): security foundation — role hierarchy (super_admin⊇admin), dynamic RBAC, real disputes engine, shared audit service, reason enforcement

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `20` ملفاً، بإجمالي `1868` إضافة و`13` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/e2e/a1-security-pentest.js` |
| `M` | `backend/src/app.module.ts` |
| `M` | `backend/src/common/auth.guard.ts` |
| `M` | `backend/src/common/permissions.ts` |
| `A` | `backend/src/common/rbac.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-disputes.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-enterprise.module.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-finance.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-orders.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/audit.service.ts` |
| `A` | `backend/src/modules/admin-enterprise/finance-suite.service.ts` |
| `A` | `backend/src/modules/admin-enterprise/orders-console.service.ts` |
| `M` | `backend/src/modules/insurance-engine/tests/insurance-flow.spec.ts` |
| `M` | `backend/src/modules/payments/payments.module.ts` |
| `M` | `backend/src/modules/pharmacy/pharmacy.controllers.ts` |
| `M` | `backend/src/modules/radiology/radiology.service.report-storage.spec.ts` |
| `M` | `backend/src/schemas/appointment.schema.ts` |
| `A` | `backend/test/a1-security.spec.ts` |
| `A` | `backend/test/a2-finance.spec.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 48. `aaef7da3734e68bd8bbed9d06284feacf9090ff2`

**ادعاء العنوان:** feat(F-web): settings edit — profile patch, language sync, notif prefs (parity #28)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `216` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/settings/edit/page.tsx` |
| `A` | `patient-web/app/api/settings/route.ts` |
| `A` | `patient-web/components-next/settings-forms.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 49. `1d802f4f64a7274698a82c043890ec9b15eb6b23`

**ادعاء العنوان:** feat(F-web): treatment programs — enroll + complete session (parity #29)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `154` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/programs/page.tsx` |
| `A` | `patient-web/app/api/programs/route.ts` |
| `A` | `patient-web/components-next/program-actions.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 50. `a57a1f022fee63a92d1572d9cafc0711e25d2562`

**ادعاء العنوان:** feat(F-web): emergency SOS trigger/cancel + active check (parity #30)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `195` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/emergency/page.tsx` |
| `A` | `patient-web/app/api/emergency/[action]/route.ts` |
| `A` | `patient-web/components-next/sos-controls.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 51. `c0b000a432dd0d488212ad9ca7e5bd921d5afbfd`

**ادعاء العنوان:** feat(F-web): community — post/vote/comment (parity #31)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، CI أو إعداد نشر. تغير `3` ملفاً، بإجمالي `248` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/community/page.tsx` |
| `A` | `patient-web/app/api/community/[action]/route.ts` |
| `A` | `patient-web/components-next/community-composer.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 52. `c863f244b1602de9c75feb3702813979b02318c0`

**ادعاء العنوان:** feat(F-web): wearables manual entry (parity #32)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `147` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/wearables/page.tsx` |
| `A` | `patient-web/app/api/wearables/route.ts` |
| `A` | `patient-web/components-next/wearable-manual-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 53. `8a34ad0643eb77b8c851e4b339cfb3f6473874f4`

**ادعاء العنوان:** feat(F-web): drug compare + advanced search (parity #33)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `204` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/drug-search/page.tsx` |
| `A` | `patient-web/app/api/medicines/compare/route.ts` |
| `A` | `patient-web/components-next/drug-compare.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 54. `106ca955515838c635534742ee5e229bc131f0e7`

**ادعاء العنوان:** docs: WEB PARITY batch-3 — backlog 15-33 complete, table + explicit remainders

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `43` إضافة و`19` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 55. `3f319d06d04b672b9d863cf736d09266933a204c`

**ادعاء العنوان:** fix(P1): server-side temp credentials + ownership field fix in hospital-staff (parent_account_id read bug)

**الأثر المرصود:** مصدر backend. تغير `1` ملفاً، بإجمالي `34` إضافة و`10` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/hospital-staff/hospital-staff.module.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 56. `20c6f2bc2334b4cc5bac655cfdecdbb87777d237`

**ادعاء العنوان:** feat(A7): command center v2 SSE controller + scheduled reports runner (cron, real aggregation compute, CSV attachment email via Resend/SES, run history)

**الأثر المرصود:** مصدر backend، عقود/حزم مشتركة، ملفات اختبار. تغير `15` ملفاً، بإجمالي `2009` إضافة و`11` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/src/modules/admin-enterprise/admin-analytics.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-cms.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-coupons.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-crm.controller.ts` |
| `M` | `backend/src/modules/admin-enterprise/admin-enterprise.module.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/analytics-suite.service.ts` |
| `A` | `backend/src/modules/admin-enterprise/command-center-v2.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/scheduled-reports.runner.ts` |
| `M` | `backend/src/modules/mail/mail.module.ts` |
| `A` | `backend/test/a3-analytics.spec.ts` |
| `A` | `backend/test/a5-coupons.spec.ts` |
| `M` | `packages/shared-contracts/src/index.ts` |
| `A` | `packages/shared-contracts/src/provider-contracts.ts` |
| `A` | `provider` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 57. `d537e9acda9849d8be9f71a6f664c69357302486`

**ادعاء العنوان:** feat(P2): provider contracts for 7 verticals + 9 governed endpoint DTOs + transition guard (7 unit gates green)

**الأثر المرصود:** عقود/حزم مشتركة، ملفات اختبار. تغير `2` ملفاً، بإجمالي `94` إضافة و`4` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `packages/shared-contracts/src/__tests__/provider-contracts.spec.ts` |
| `M` | `packages/shared-contracts/src/provider-contracts.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 58. `4278728f3ebf9923de2286266740859bb87e5467`

**ادعاء العنوان:** fix(audit round): 5 real defects found on self-review

**الأثر المرصود:** مصدر backend. تغير `5` ملفاً، بإجمالي `86` إضافة و`11` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/admin-enterprise/admin-enterprise.module.ts` |
| `M` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` |
| `M` | `backend/src/modules/admin-enterprise/orders-console.service.ts` |
| `A` | `backend/src/modules/admin-enterprise/patient-gdpr.controller.ts` |
| `M` | `backend/src/modules/admin/admin.controller.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 59. `143c98db0661d39564df492ab4b6600fc498b36f`

**ادعاء العنوان:** feat(P3): 9 governed provider endpoints (insurance-decision, coverage-decision x3, CRM, referrals/mine, technicians roster, claims actions, reports/inbound, availability round-trip) + shifts PATCH/DELETE — e2e gate 13/13 on live server

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `4` ملفاً، بإجمالي `869` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/e2e/provider-production.js` |
| `M` | `backend/src/app.module.ts` |
| `M` | `backend/src/modules/facility-ops/facility-ops.module.ts` |
| `A` | `backend/src/modules/provider-production/provider-production.module.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 60. `f10ea7fe4dbe580832de7bca3f99ae22531c29f2`

**ادعاء العنوان:** fix(J-review): hospital-staff ownership write path (strict-mode strip re-broke access) + review verdict with 5 mandatory follow-ups

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، مصدر backend، ملفات اختبار، توثيق. تغير `21` ملفاً، بإجمالي `1763` إضافة و`42` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `REVIEW_VERDICT.md` |
| `A` | `backend/e2e/package-lock.json` |
| `M` | `backend/package-lock.json` |
| `M` | `backend/package.json` |
| `M` | `backend/src/modules/hospital-staff/hospital-staff.module.ts` |
| `A` | `backend/test/a-enterprise.integration.e2e-spec.ts` |
| `M` | `patient-web/app/[locale]/chat/[threadId]/page.tsx` |
| `M` | `patient-web/app/[locale]/community/page.tsx` |
| `M` | `patient-web/app/[locale]/family/family-ssr.test.ts` |
| `M` | `patient-web/app/[locale]/family/page.tsx` |
| `M` | `patient-web/app/[locale]/pharmacy/offers/page.tsx` |
| `M` | `patient-web/app/api/ai/route.ts` |
| `M` | `patient-web/app/api/auth/session/route.ts` |
| `M` | `patient-web/app/api/drug-scanner/route.ts` |
| `A` | `patient-web/app/api/family/members/route.ts` |
| `M` | `patient-web/app/api/settings/route.ts` |
| `M` | `patient-web/components-next/family-manage-panel.tsx` |
| `A` | `patient-web/components-next/offer-select-button.tsx` |
| `M` | `patient-web/components-next/push-enable.tsx` |
| `M` | `patient-web/lib/api/chat.ts` |
| `M` | `patient-web/pnpm-lock.yaml` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 61. `703053558a8c9464d4c9d6ff90ce0045f498bd18`

**ادعاء العنوان:** test(enterprise): REAL integration gate 18/18 — boots AdminEnterpriseModule on in-memory Mongo, probes A1→A7 over HTTP

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `12` ملفاً، بإجمالي `216` إضافة و`58` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/common/permissions.ts` |
| `M` | `backend/src/common/rbac.ts` |
| `M` | `backend/src/modules/admin-enterprise/admin-security.controller.ts` |
| `M` | `backend/src/modules/auth/auth.service.spec.ts` |
| `M` | `backend/src/modules/auth/patient-web-auth.contract.spec.ts` |
| `M` | `backend/src/modules/insurance-engine/tests/insurance-flow.spec.ts` |
| `M` | `backend/src/modules/labs/labs.service.spec.ts` |
| `M` | `backend/src/modules/pharmacy/schemas/pharmacy.schema.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-orders-provider.service.ts` |
| `M` | `backend/test/a-enterprise.integration.e2e-spec.ts` |
| `D` | `patient-web/tests/express5-compatibility.test.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 62. `265a133d89c3b084151d801ac10e8cf77cc3d02e`

**ادعاء العنوان:** feat(segments): dynamic audiences (plan E) — pure DSL→Mongo compiler with privacy fence, preview/count/members endpoints, audit; 6/6 unit tests

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `5` ملفاً، بإجمالي `280` إضافة و`4` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/admin-enterprise/admin-enterprise.module.ts` |
| `A` | `backend/src/modules/admin-enterprise/admin-segments.controller.ts` |
| `A` | `backend/src/modules/admin-enterprise/segments.engine.ts` |
| `M` | `backend/src/modules/pharmacy/schemas/pharmacy.schema.ts` |
| `A` | `backend/test/a4-segments.spec.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 63. `5ab5beec72672834b6064e47e522e4e6a379c027`

**ادعاء العنوان:** fix(web-security): bookings BFF idempotency + compare route CSRF gate

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `16` إضافة و`7` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/api/bookings/[kind]/route.ts` |
| `M` | `patient-web/app/api/medicines/compare/route.ts` |
| `M` | `patient-web/components-next/service-booking-form.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 64. `91cf09a316686988e4e4cceebcec1150263b3348`

**ادعاء العنوان:** test(web): align suites with fail-closed CSRF and I-wave1 indexing policy

**الأثر المرصود:** ملفات اختبار. تغير `8` ملفاً، بإجمالي `31` إضافة و`14` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/cancel/route.test.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/payment-intent/route.test.ts` |
| `M` | `patient-web/app/api/appointments/[appointmentId]/reschedule/route.test.ts` |
| `M` | `patient-web/app/api/appointments/book/route.test.ts` |
| `M` | `patient-web/app/api/auth/otp/otp-routes.test.ts` |
| `M` | `patient-web/app/seo.test.ts` |
| `M` | `patient-web/tests/proxy.test.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 65. `3b5218f4818072ecb9538944bd471e6c8e7cd518`

**ادعاء العنوان:** docs: quality+security gate results — tsc/tests green both apps, audit fixes, explicit remaining decisions

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `14` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 66. `c92a03bbc298b5266f832b97f1a215c3bf31b877`

**ادعاء العنوان:** docs: admin session review verdict — approved, 4 GO-gate items remain

**الأثر المرصود:** مسارات BFF/API، مصدر backend، ملفات اختبار، توثيق. تغير `7` ملفاً، بإجمالي `317` إضافة و`22` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `REVIEW_VERDICT_ADMIN.md` |
| `A` | `backend/e2e/pharmacy-scenarios.js` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-allocation.service.ts` |
| `M` | `backend/src/modules/pharmacy/services/pharmacy-broadcast.service.ts` |
| `M` | `backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts` |
| `M` | `backend/src/modules/pharmacy_ops/pharmacy_ops.module.ts` |
| `M` | `patient-web/app/api/appointments/book/route.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 67. `c977233ed9c49d20e1765f640c7b08714d0be3dc`

**ادعاء العنوان:** feat(go-gate#3): wire seo_controls into robots()/sitemap() — blocked entity types vanish from sitemap and get explicit Disallow lines

**الأثر المرصود:** مصدر backend، ملفات اختبار، توثيق. تغير `8` ملفاً، بإجمالي `166` إضافة و`12` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `REVIEW_VERDICT_ADMIN.md` |
| `M` | `backend/src/modules/admin-enterprise/admin-enterprise.module.ts` |
| `M` | `backend/src/modules/admin-enterprise/admin-ops.controller.ts` |
| `A` | `backend/src/modules/seo/seo-controls.util.ts` |
| `M` | `backend/src/modules/seo/seo.controller.ts` |
| `M` | `backend/src/modules/seo/seo.service.ts` |
| `M` | `backend/test/a-enterprise.integration.e2e-spec.ts` |
| `A` | `backend/test/go3-seo-controls.spec.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 68. `9502dd5ecfd65a95488e6c5fc5bfd52388815257`

**ادعاء العنوان:** feat(H+20): REST chat fanout to WS room + monthly health report endpoint

**الأثر المرصود:** مصدر backend. تغير `3` ملفاً، بإجمالي `87` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `backend/src/modules/chat/chat.gateway.ts` |
| `M` | `backend/src/modules/health/health.controller.ts` |
| `M` | `backend/src/modules/health/health.service.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 69. `d53092e11e1c480f646201ff307ab0872773a34d`

**ادعاء العنوان:** feat(H-web): chat realtime via socket.io + attachments end-to-end (parity #13 complete)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب، CI أو إعداد نشر. تغير `10` ملفاً، بإجمالي `335` إضافة و`28` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/chat/[threadId]/page.tsx` |
| `A` | `patient-web/app/api/chat/threads/[threadId]/media/route.ts` |
| `M` | `patient-web/app/api/chat/threads/[threadId]/messages/route.ts` |
| `A` | `patient-web/app/api/chat/threads/[threadId]/rt-token/route.ts` |
| `A` | `patient-web/app/api/media/[mediaId]/url/route.ts` |
| `M` | `patient-web/components-next/chat-composer.tsx` |
| `A` | `patient-web/components-next/chat-realtime.tsx` |
| `M` | `patient-web/package.json` |
| `M` | `patient-web/pnpm-lock.yaml` |
| `M` | `patient-web/proxy.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 70. `2af681b328ea0f867d0be17df045ebf4edc0baed`

**ادعاء العنوان:** feat(F-web): security re-auth — password rotation + 2FA toggles (parity #28 complete)

**الأثر المرصود:** مسارات BFF/API، صفحات ويب. تغير `3` ملفاً، بإجمالي `152` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/settings/security/page.tsx` |
| `A` | `patient-web/app/api/settings/security/route.ts` |
| `A` | `patient-web/components-next/security-forms.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 71. `65cb86e64ad66525aaaa323f9990e4645cccc685`

**ادعاء العنوان:** feat(I-web): monthly report page + trends sparklines (parity #20/I completion)

**الأثر المرصود:** صفحات ويب. تغير `3` ملفاً، بإجمالي `134` إضافة و`8` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `patient-web/app/[locale]/health/monthly-report/page.tsx` |
| `M` | `patient-web/app/[locale]/health/page.tsx` |
| `M` | `patient-web/app/[locale]/health/trends/page.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 72. `7ba7501657cd7a5c8a4a83fa90b9fc3e148a391e`

**ادعاء العنوان:** feat(P5-P7): vertical lifecycle gate 9/9 — lab sample chain→REPORTED+TAT, radiology coverage/report-phases with enum-valid mirror + secure storage, nursing geofence visit chain, ambulance dispatch→ledger; fixes radiology partial-approval mirror enum

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `2` ملفاً، بإجمالي `272` إضافة و`3` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/e2e/provider-verticals.js` |
| `M` | `backend/src/modules/provider-production/provider-production.module.ts` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 73. `c1c14cbd20edfd1b4aa28d590dd5ed7afa31e14e`

**ادعاء العنوان:** feat(G-web): server loyalty redeem-quote on pharmacy pay (G completion)

**الأثر المرصود:** صفحات ويب. تغير `1` ملفاً، بإجمالي `17` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `patient-web/app/[locale]/pharmacy/pay/page.tsx` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 74. `a56321cc3753e80fcc287c05a68a75ee97afde01`

**ادعاء العنوان:** docs: completion batch recorded — parity #13/#28/#20/G fully closed; remaining = owner decision + gate J

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `11` إضافة و`36` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 75. `0c97a2affe00caa5ba7535ae66336c46ad2d5c4b`

**ادعاء العنوان:** feat(P9): master gate runner — GO verdict across contracts(7), ZERO-MOCK+app-contracts(14), e2e P3(13)/P4(8)/P5-P7(9)

**الأثر المرصود:** مصدر backend، ملفات اختبار. تغير `1` ملفاً، بإجمالي `53` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `A` | `backend/e2e/run-all-gates.js` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 76. `109fd89393ba99b8599760f5c7974364df5bfaff`

**ادعاء العنوان:** docs: PROVIDER_PRODUCTION_PLAN P1-P9 execution record — all gates green, structural fixes, run instructions

**الأثر المرصود:** توثيق. تغير `1` ملفاً، بإجمالي `27` إضافة و`0` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `HANDOFF.md` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.

## 77. `51a84c76a690f30baac8b4bb3df6ab575aad4520`

**ادعاء العنوان:** feat(go-gate#2): mail smoke tool — one command proves key+domain+CSV attachment over the production Resend→SES path

**الأثر المرصود:** مصدر backend، توثيق. تغير `2` ملفاً، بإجمالي `93` إضافة و`1` حذفاً بحسب Git numstat.

| الحالة | الملف |
|---|---|
| `M` | `REVIEW_VERDICT_ADMIN.md` |
| `A` | `backend/scripts/mail-smoke.js` |

**حد الإثبات:** قائمة الملفات أو فروقها لا تثبت أن الواجهة موصولة بخدمة سليمة، أو أن endpoint محمي، أو أن البيانات حقيقية، أو أن الاختبار ناجح، أو أن النشر يمر.
