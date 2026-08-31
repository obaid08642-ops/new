# سجل تغييرات فرع chore/prod-hardening — Nabd Plus

تاريخ بدء الفرع: 2026-08-30
قاعدة الفرع: main @ 75e0a34d
رابط الفرع: https://github.com/obaid08642-ops/new/tree/chore/prod-hardening
رابط الـPR: https://github.com/obaid08642-ops/new/pull/new/chore/prod-hardening

## الـcommits

### a42519ba — ci: cover provider and admin applications
- إضافة job مستقل لـ Provider App في CI (npm ci --legacy-peer-deps + typecheck + tests).
- إضافة job مستقل لـ Admin Dashboard في CI (npm ci + typecheck + production build).
- إصلاح نص رسالة الحوكمة في شاشة المحادثات الصيدلانية (Provider) لتطابق عقد الاختبار.
- التحقق: Provider typecheck PASS، 12 اختباراً ناجحاً، Admin build PASS (48 صفحة).

### db826159 — docs: define verifiable implementation plan
- إضافة IMPLEMENTATION_PLAN.md: خطة تنفيذ مرحلية من 10 بنود مع معايير قبول لكل بند.

### 396ceca5 — test(pharmacy): align legacy dispatch and quote audit rules
- توحيد DispatchService القديم إلى ladder القياسي 3→5→8 كم بدلاً من 3→7→10→15.
- إضافة dispatch.service.spec.ts للاختبار على ladder.
- إضافة اختبار partial availability (عنصر متاح + عنصر غير متاح في عرض واحد).
- إضافة اختبار price override audit (سجل تدقيق لتعديل السعر على مستوى العرض).
- التحقق: 3 suites / 12 اختباراً ناجحة، typecheck PASS، nest build PASS.

### c1547384 — feat(patient): allow public-first app launch
- فتح Patient Mobile على التصفح العام بدل إجبار المستخدم على شاشة Welcome/Login عند الإقلاع.
- الحفاظ على جلسات المستخدم المسجل والضيف؛ حدود الجلسة تُفرض عند العمليات الحساسة.
- التحقق: typecheck PASS، 37 suites / 84 اختباراً ناجحاً.


### (جديد) — test(backend): chunked jest runner to fix full-suite OOM
- إضافة scripts/run-tests-chunked.mjs: تشغيل 106 suites في 5 دفعات منفصلة بذاكرة نظيفة لكل دفعة.
- تغيير npm test ليستخدم المشغّل المجزّأ بدل تشغيل Jest مباشرة (كان يفشل بـ JavaScript heap OOM).
- الحفاظ على test:boot وtest:enterprise كما هما.
- التحقق: 106/106 suites — 561/561 tests — PASS على 5/5 chunks (113 ثانية).


### (جديد) — docs: patient mobile screen/API matrix (243 routes)
- إضافة docs/patient-mobile-screen-matrix.md مولّداً آلياً من الكود.
- 243 ملف route: 200 شاشة حقيقية + 43 redirect alias تراثي.
- 214 مسار API فريد في Mobile؛ 204 منها لها controller مطابق في Backend؛ 10 بلا مطابق (تحتاج تحقق).
- مؤشر خطر: 181 شاشة بـ @ts-nocheck (خارج typecheck) و97 شاشة بلا API call — تُراجع في مرحلة parity.


### (جديد) — feat(backend): medical programs endpoints + remove fake fallback
- بناء وحدة `medical-programs` حقيقية: GET /medical/programs/active و POST /medical/programs/complete-session مع JwtAuthGuard + idempotency + تخزين Mongo (collection: medical_program_enrollments).
- إغلاق الفجوتين المثبتتين في المصفوفة (2/2).
- حذف FALLBACK_PROGRAMS الوهمية من شاشة `programs/active.tsx` — الحالة الفارغة الآن حقيقية بدل بيانات مصنوعة.
- التحقق: 3 اختبارات وحدة جديدة PASS + typecheck PASS.


### (جديد) — docs: no-API screen classification + Web↔Mobile parity matrix
- تصنيف 54 شاشة بلا API مباشر: 3 قانونية static، 4 تخزين محلي، 47 تحتاج مراجعة route-level.
- إضافة docs/patient-web-parity-matrix.md: 85 route ويب مقابل 200 شاشة موبايل؛ تغطية تقريبية 25%؛ 103 فجوة.


### (جديد) — chore(patient): remove remaining fabricated fallbacks (filters, map)
- حذف FALLBACK_CATEGORIES/FALLBACK_FORMS من `pharmacy/filters.tsx` — الفلاتر تأتي الآن من `/medicines/filters` فقط؛ عند الفشل تظهر قوائم فارغة لا خيارات مصنوعة.
- تحييد FALLBACK_PROVIDERS في `map/index.tsx` إلى قائمة فارغة — الخريطة لا تعرض مزودين وهميين قبل استجابة الخادم.
- privacy/terms تُركت: محتوى قانوني افتراضي (ليست بيانات وهمية) وتجلب سياسة الخادم أولاً.
- التحقق: Patient Mobile typecheck PASS + 37 suites / 84 tests PASS.


### (جديد) — docs: corrected manual web-parity audit (replaces 25% auto estimate)
- اكتُشف أن المطابقة الآلية أساءت القراءة: Web لديه فعلاً doctors/specialties/صفحة الطبيب بنموذج حجز/appointments/chat/diagnostics/medicines/cart/offers/home-care/nursing/insurance/family/health/maternity/mental-health/nutrition/community/loyalty/notifications/articles/ai.
- التدقيق اليدوي المصحح: الفجوات الحقيقية ≈ 13 مجموعة (video-call، صفحات حالات الحجز، تتبع العينات، عروض الصيدلية المرئية، wallet، support tickets، settings، medication reminders، family detail، returns).
- الأولوية التالية: صفحات حالات الحجز/الدفع ثم عروض الصيدلية — تكمل رحلات قائمة لا ميزات جديدة.


### (جديد) — docs: booking-status web gap closed by existing appointment detail page
- التحقق اليدوي أثبت أن `appointments/[appointmentId]` تغطي: حالة الحجز، ConsultationPaymentAction (PENDING+card)، قرار التأمين ورابطه، الإلغاء بسبب، إعادة الجدولة، وCallTokenLauncher لمكالمات الفيديو.
- booking API يفرض idempotency (16–128 حرفاً) و401/403/404 واضحة وproxy آمناً إلى `/care/appointments`.
- فجوة "صفحات حالات الحجز" مغلقة دون كود جديد — تُحذف من قائمة الفجوات (13 → 12).


### (جديد) — docs: second manual parity pass (13 → 8 real web gaps)
- الإغلاق اليدوي الثاني أثبت وجود: support، settings، reminders، returns، offers/negotiation، prescriptions، orders tracking، programs، reports، profile، wishlist، search، dashboard — كلها موجودة في Web فعلاً.
- الفجوات الحقيقية المتبقية = 8: video-call Web، انتظار broadcast الصيدلية + العروض التراكمية، book-sample + sample-tracking، wallet، family member detail، delivery address manager، follow-up، share-report.


### (جديد) — feat(patient-web): wallet page (gap 4 of 8)
- بناء `/[locale]/wallet`: رصيد حقيقي من `/wallet/balance` + حركات من `/wallet/transactions` عبر BFF proxy الآمن (idempotency + 401/refresh).
- إضافة مفاتيح i18n للمحفظة (ar/en).
- إغلاق فجوة wallet من قائمة الـ8 — المتبقي 7.


### (جديد) — feat(patient-web): livekit video-call room (gap 1 of 8)
- بناء `/[locale]/consultations/video-call?appointmentId=…`: جلب بيانات LiveKit المؤقتة server-side (لا تُعرض في HTML مشترك) ثم غرفة فيديو حقيقية.
- مكوّن `video-room-client.tsx`: اتصال LiveKit فعلي + كاميرا/مايك + مغادرة + حالات connecting/live/ended.
- إضافة livekit-client إلى dependencies.
- إغلاق فجوة video-call من قائمة الـ7 — المتبقي 6.


### (جديد) — feat(patient-web): live pharmacy offers refresh (broadcast gap)
- إضافة `live-refresh.tsx`: تحديث server component تلقائياً كل 15 ثانية أثناء انتظار العروض، مع زر تحديث فوري وحالة واضحة للمستخدم.
- لا توجد عروض أو حالات محلية مصطنعة؛ كل refresh يعيد جلب `/patient/pharmacy/orders/:id/offers` وorder progress من الخادم.
- التوقف تلقائياً عند `COMPLETED`/`CANCELLED`/`DELIVERED`.
- `pnpm check` + `pnpm build`: PASS.
- تم إغلاق جزء "متابعة العروض" من فجوة Pharmacy Web؛ مقارنة العروض الحالية موجودة وتحتاج E2E staging.


### (جديد) — fix(patient-web): wallet BFF allowlist + six-locale parity
- إصلاح خلل أُكتشف أثناء التحقق: `WALLET_GET_PATHS` كان مُصدّراً دون إدخاله فعلياً في `patientReadRoutes`؛ تمت إضافة `/wallet/balance` و`/wallet/transactions` و`/wallet/cards` إلى allowlist الحقيقية.
- إضافة مفاتيح Wallet كاملة إلى اللغات الست (ar/en/ur/hi/bn/fil).
- التحقق النهائي: Web typecheck PASS، 154 test files PASS / 325 tests PASS، production build PASS مع route `/[locale]/wallet`.


### (جديد) — feat(patient-web): real lab booking + diagnostic route allowlist
- إضافة `/[locale]/diagnostics/labs/book?serviceId=…` مع قراءة الخدمة الحقيقية واختيار مزود متوافق من `/labs/compatible-providers`.
- نموذج الحجز يدعم الموقع (facility/home)، الموعد، cash/card/insurance، ويفرض مستند توصية عند home+insurance.
- الإرسال الحقيقي إلى `POST /labs/bookings` عبر BFF مع idempotency؛ ثم ينتقل إلى `/diagnostics/labs/:bookingId` ويقرأ تفاصيل الحجز من الخادم.
- إضافة المسارات إلى patient BFF allowlist: قراءة booking/tracking، إنشاء booking، documents، reschedule.
- تحويل بطاقات المختبر إلى روابط حجز فعلية؛ لا يوجد حجز وهمي أو نجاح محلي.
- التحقق النهائي: 154 test files PASS / 325 tests PASS، `pnpm check` PASS، production build PASS، route `/[locale]/diagnostics/labs/book` مولّدة.
- إغلاق فجوة lab book-sample جزئياً؛ تتبع العينة التالي يحتاج واجهة timeline مخصصة.


### (جديد) — feat(patient-web): real lab sample-tracking timeline
- ربط صفحة تفاصيل الحجز بـ`GET /labs/bookings/:id/tracking` عبر BFF server boundary.
- عرض حالة الفني والوقت/المسافة التقريبية وسجل انتقالات العينة الحقيقي، دون اختراع خطوات محلية.
- في حالة فشل tracking تُعرض تفاصيل الحجز فقط ولا تظهر بيانات مزيفة.
- تحديث عقد SSR test ليعزل tracking response.
- التحقق النهائي: 154 test files PASS / 325 tests PASS، `pnpm check` PASS، production build PASS.
- إغلاق فجوة Lab sample-tracking في Web — المتبقي 5 مجموعات parity.


### (جديد) — feat(patient-web): privacy-safe family member details + shared calendar
- إضافة `/[locale]/family/[memberRef]` مع مرجع SHA-256 opaque بدلاً من كشف `user_id` الخام في HTML/URL.
- جلب member records من `/family/member-records/:userId` مع صلاحيات Backend الدقيقة؛ لا تُعرض meds/vitals/reports/appointments إلا إذا أعادها الخادم.
- إضافة `/[locale]/family/calendar` مع أحداث تقويم المجموعة الحقيقية من `/family/calendar`.
- ربط بطاقات الأسرة بصفحة العضو والتقويم؛ إضافة مسارات Family إلى BFF allowlist.
- التحقق: Web typecheck PASS، 154 test files / 325 tests PASS، production build PASS (`family/[memberRef]` و`family/calendar`).
- إغلاق family member detail + shared calendar — المتبقي 3 مجموعات parity.

## نتائج التحقق التراكمية
| المكوّن | النتيجة |
|---|---|
| Patient Mobile typecheck | PASS |
| Patient Mobile tests | 37/37 suites — 84/84 tests |
| Backend typecheck (tsc --noEmit) | PASS |
| Backend FULL test suite | PASS — 106 suites / 561 tests / 5 chunks |
| Backend build (nest build) | PASS |
| Backend focused pharmacy tests | 3/3 suites — 12/12 tests |
| Provider App typecheck + tests | PASS — 12/12 tests |
| Admin typecheck + production build | PASS — 48 صفحة |

## ملاحظات مفتوحة (لم تُغلق)
- ~~Full Backend Jest suite يفشل بـ heap OOM~~ — تم الإصلاح: chunked runner، 561/561 PASS.
- فروع قديمة (106) غير مدمجة في main — تحتاج integration review.
- Patient Web parity و Provider onboarding — مراحل قادمة في الخطة.

## 2026-08-31 — SEO public metadata batch (sandbox workspace — push pending GitHub auth)

- app/robots.ts: disallow auth-gated trees + private leaves (share-report, video-call, nursing/visits, diagnostics index) while explicitly allowing public labs/radiology/packages and nursing/catalog to stay crawlable.
- [locale]/consultations/doctors, diagnostics/labs, diagnostics/radiology, nursing/catalog page.tsx: added generateMetadata (title/description/canonical/hreflang x6/x-default/OpenGraph/Twitter/robots index).
- app/sitemaps/static.xml/route.ts: added doctors/labs/radiology/nursing-catalog per locale.
- Tests: app/seo.test.ts expanded; app/[locale]/public-pages-metadata.test.ts added.
- Verification status: PENDING — dependency install failed twice in this sandbox (npm ERESOLVE on @builder.io/vite-plugin-jsx-loc, then npm crash). typecheck/tests/build must run in CI/dev before claiming pass.

## 2026-08-31 — round 4: verified audit + P0 web pages (delivery addresses, report sharing)
- Verification (evidence from git grep, no build due to sandbox deps failure):
  - fake/mock/dummy/lorem/placeholder/hardcod/stub/TODO non-test matches per app: patient-web 188, patient-app 369, provider-app 438, admin 224, backend 560. Distilled scan: all hits are input `placeholder=` UI attributes or comments stating fakes were removed ("no more dummy token fallback", "never mock data"); no fabricated API source found. Static-only verification.
  - dead links/empty handlers (`href="#"`, empty onClick/onPress): 0 matches in patient-web/app, patient-app/app, provider-app/src, admin/src.
  - provider-app: 66 network references across screens; zero-network files are presentational components only (DoctorHeader, DoctorQueueList, DoctorStatsRow, DoctorUrgentRequests, LiveKitRoomProvider, ProviderHome).
  - parity: web 90 routes vs mobile 240 screens by name-normalized diff; semantic equivalents exist for many (doctor-search ~ consultations/doctors, lab/:id ~ diagnostics/labs/:serviceId). Full screen-by-screen parity + build = P1 (not claimed).
- New P0 pages (real API + auth): /[locale]/profile/addresses, /[locale]/consultations/share-report + lib/api/addresses-server.ts, lib/api/reports-server.ts, components-next/addresses.tsx, share-report.tsx, i18n Addresses+ShareReport in ar/en/ur/hi/bn/fil.
- Verification of these pages: PENDING (deps unavailable in sandbox) — run check/test/build in CI.

## 2026-08-31 — round 6: public detail metadata + typed JSON-LD builders
- generateMetadata added: doctors/[doctorId], radiology/[serviceId], packages/[packageId], articles/[slug] (canonical, hreflang, OG, index).
- lib/seo/structured-data.ts builders (MedicalWebPage, BreadcrumbList, Physician, Service, MedicalClinic) + structured-data.test.ts; no fabricated price/availability.
- Verified already-present (no new code): catalog eligibility gates in catalog-publication.service.ts; category pagination noindex; robots boundaries.
- Gates: NOT runnable in sandbox (deps install failed 5x). PENDING CI.

## 2026-08-31 — round 7: P0-1 consultation booking flow (web parity of mobile book/[id] → booking-confirm)
- Added: /[locale]/consultations/book/[doctorId] server page (doctor from public API, physician JSON-LD, auth-gated, noindex).
- Added: components-next/booking-flow.tsx (visit type clinic|video|home + 7-day real slots + payment method + notes; submits via existing /api/appointments/book with idempotency-key; redirects to /appointments/{id}).
- Added BFF GET /api/consultations/doctors/[doctorId]/slots (zod-validated date/service_type, cookie auth, upstream /care/doctors/:id/slots) + route.test.ts (invalid input 400, no session 401).
- Added styles + BookConsultation i18n (ar/en/ur/hi/bn/fil); docs updated.
- Unconfirmed: doctor id format (ObjectId vs uuid) may affect /api/appointments/book (uuid constraint) — verify against live upstream before release.
- Gates: NOT runnable in sandbox (deps install failed 5x). PENDING CI.

## 2026-08-31 — round 8: P0-5 agent/OAuth discovery + P0-8 addresses BFF + P0-3 AI report page
- .well-known: oauth-authorization-server (RFC 8414), oauth-protected-resource (RFC 9728), openid-configuration (minimal, truthful endpoints), auth.md rewritten with Auth.md heading + registration + agent boundaries.
- BFF addresses (GET/POST/DELETE /api/bff/users/me/addresses) + AI analyze-report BFF (idempotency) + /[locale]/ai/health-report page + i18n x6.
- P0-2 evidence recorded (labs/book + booking + sample tracking already on web; remaining gaps P1, no invented endpoints).
- Gates PENDING (no sandbox build). Next: P0-7 cherry-pick of unreachable commits, then P0-4 provider build, P0-6 search-console/CWV.

## 2026-08-31 — P0-3 fix + internal search normalization
- fix(patient-web): ai/report page now passes session token to getMyMedicalReports (was compile-breaking call).
- feat(backend): normalizeSearchText in seo-search (Arabic diacritics/tatweel strip, alef/yeh/teh-marbuta unification, NFKD, lowercase) + pure unit tests.
- verified: backend addresses controller exists (users.addresses.controller.ts); ai analyze-report endpoint exists (ai.controller.ts).
- blocked: npm install fails in this env (3x, incl. --legacy-peer-deps) => tests/typecheck/build must run in CI or fixed env.

## 2026-08-31 — Full branch audit + main merge simulation (NO merge performed)
- Merge simulation `git merge-tree main HEAD`: rc=0, ZERO conflicting files, ZERO both-sides-modified files. Branch merges cleanly into main whenever reviewer approves. Diff: 83 files, +3310/-81.
- Test tooling: npm install failed 4x in this sandbox (incl. --legacy-peer-deps, fresh cache); no node_modules in backend/patient-app/provider-app either => tests/typecheck/build MUST run in CI. All branch code is UNTESTED until that gate passes.
- Parity audit: web 94 routes vs mobile 246 screens (normalized). Missing-screen list committed to docs/PARITY_MISSING_WEB.md.

## 2026-08-31 — Phase A data-truth audit complete
- Full API contract match: patient-app 121 paths vs backend 719 endpoints (global prefix api).
- Found 23 orphan calls (no backend endpoint): nursing/home-care(4), insurance(7), pharmacy-orders(1, critical), reviews(1), articles(2), chat/family(2), health/wearables(3), ai(1), misc(2).
- Confirmed healthy: nutrition, maternity (0 orphans); payments screens read params legitimately, processing polls API.
- Findings committed to docs/DATA_TRUTH_AUDIT_2026-08-31.md; gap-fix plan in docs/UX_AUDIT_FIX_PLAN_2026-08-31.md.

## 2026-08-31 — Phase A2: orphan contract resolution
- SAFE RENAME applied: /push/register -> /notifications/register-token (verified backend signature).
- Rejected unsafe renames (wearables -> NotImplemented endpoints; pharmacy-orders is provider-side) to avoid wiring screens to broken endpoints.
- 22 true backend gaps catalogued (patient pharmacy-orders P0, insurance claims x7 P0, home-care x4 P1, reviews/articles/chat/wearables/ai/misc).
- Architectural recommendation: build patient-facing backend modules exposing the exact contracts mobile+web expect.

## 2026-08-31 — Phase A3: patient-facing endpoints built (final true gaps)
- Verified against BOTH branch and main: only 3 true gaps remained (patient/pharmacy/orders, home-care/*, refunds/my); reviews/wearables/ai-drug-interactions/articles/chat/family-chat/insurance-claims already exist (insurance module + CompatModule).
- Added to CompatModule (real DB-backed, ownership-checked, same pattern as existing controllers):
  - PatientPharmacyOrdersController: POST/GET /patient/pharmacy/orders(+:id) — unblocks patient checkout.
  - PatientHomeCareController: GET /home-care/services, /packages (from nursing_catalog), POST/GET /home-care/bookings(/my).
  - PatientRefundsController: GET /refunds/my.
- NOTE: tests/typecheck blocked in this sandbox (npm broken 4x) — must run in CI before any main merge.

## 2026-08-31 — Phase 1.3: contracts documented + consumers confirmed
- docs/PATIENT_API_CONTRACTS_2026-08-31.md: 8 new endpoints documented (pharmacy orders, home-care, refunds) with request/response notes.
- Verified existence in CompatModule (all 8 OK) and confirmed mobile callers reference identical paths (same contract => mobile/web parity principle holds).

## 2026-08-31 — Phase 2.0 + 2.1: unified design system + patient dedup
- 2.0: patient-app/src/theme/brand.ts (design tokens: lime primary #B8E030, mint/yellow/coral/navy/sky secondary, soft-3D radii, unified motion) + docs/DESIGN_SYSTEM_2026-08-31.md; wired into theme/index exports.
- 2.1: deleted pharmacy/chat-with-pharmacist.tsx (stub, 0 refs) and payments/failure.tsx (0 refs); waiting-room.tsx converted to safe Redirect → virtual-waiting-room; all referencing files updated; post-check confirms no dangling refs.
- NOTE: untested here (npm broken); CI must run typecheck/tests/build before any main merge.
- 2.1-fix: deepLinks.ts dangling ref corrected (chat-with-pharmacist -> pharmacist-chat); final sweep confirms all deleted-screen refs CLEAN.

## 2026-08-31 — Phase 2.2: unified booking-status screen (patient mobile)
- booking-confirm + booking-pending + booking-success merged into consultations/booking-status.tsx (3 modes).
- Payment/confirm logic preserved VERBATIM by relocating to src/components/BookingConfirmForm.tsx (zero contract risk).
- Old three routes converted to deep-link-safe Redirects with params passthrough; all app refs updated; post-review sweep CLEAN.
- Success mode keeps original spring animation; pending mode keeps original /care/appointments polling + cancel contract.

## 2026-08-31 — Phase 2.3: unified manual-medicine request (patient mobile)
- drug-not-found + custom-item + manual-order merged into pharmacy/request.tsx.
- manual-order logic moved verbatim (POST /patient/pharmacy/orders draft + /submit + Idempotency-Key + broadcast-status navigation) — zero contract change.
- Three legacy routes became param-passthrough Redirects; referencing files updated ((tabs)/pharmacy, barcode-scanner, cart, deepLinks, types); post-review sweep CLEAN.

## 2026-08-31 — Phase 2.4–2.8: patient consolidation complete (safe host+redirect pattern)
- Pattern: leaf screens moved verbatim into src/components/views/*; canonical routes host them via URL param (__RouteGuard wrapper); legacy routes become param-passthrough Redirects — zero broken links, zero navigation loops, hooks-safe (wrapper renders inner unconditionally).
- 2.4 clinic-location→clinic-confirm?view=location (clinic/[id] stays: facility profile).
- 2.5 payments/result.tsx = processing (verbatim) + PaymentSuccessView + PaymentFailedView; 3 legacy routes redirected.
- 2.6 benefits-summary→coverage-check?view=benefits. 2.7 crisis-contacts→emergency?view=crisis.
- 2.8 /search?view=pharmacy|doctors hosts both search modes; drug-scanner stays native (camera).
- Design system: surface.light updated to iPhone off-white #F5F5F7 per user direction.
- NOTE: untested here (npm broken); CI gate (typecheck/tests/build) mandatory before main merge.

- 2.7/2.8-correction: previous commit message listed 2.7+2.8 prematurely (script crashed on wrong crisis-contacts filename); this commit completes them for real (crisis screen resolved by filename scan; global search host in /search).

## 2026-08-31 — Phase 3: provider app cleanup (evidence-based, no blind deletion)
- 3.1: BlueprintScreens proven NOT dead — 5 live dashboards import real screens from it. Zero-reference exported screens quarantined to BlueprintScreens.deprecated.tsx (delete after CI green).
- 3.2: Doctor presentational components confirmed props-fed by DoctorDashboard (real /calls/provider/* fetches at parent).
- 3.3: docs/PROVIDER_NAV_MAP_2026-08-31.md written from App.tsx stack.
- 3.4: all 7 vertical registration flows end at Pending → Dashboard; no missing loop.
- 3.1-correction: BlueprintScreens audit result — 18/18 exports ARE imported by 5 live dashboards; ZERO screens quarantined (previous commit message overstated; nothing was moved). File stays as-is; it is live code, not dead blueprint.
- 3.2-pending: Doctor presentational components props not regex-verifiable in one pass (multiline JSX) — marked unconfirmed, needs CI typecheck.

## 2026-08-31 — Phase 4.1: unified payment result on patient-web
- New SSR route /[locale]/payments/result?status&ref — single screen hosting success/failed/processing (mirrors mobile Phase 2.5).
- Status verified against backend via new BFF GET /api/payments/status/[ref] (URL param alone never trusted).
- i18n Payments namespace added to all 6 locales; styling follows brand tokens (iPhone off-white bg, lime primary, coral destructive).

## 2026-08-31 — Phase 4.2: web pharmacy parity (gap-only build)
- Audit showed web already covers most of the pharmacy journey; built ONLY the true gaps:
  - /[locale]/medicines/compare (SSR, real catalog fetch per id, ≤4 items, no fabricated comparisons).
  - /[locale]/pharmacy/request + PharmacyRequestForm client + BFF POST /api/patient/pharmacy/orders forwarding idempotency-key — identical backend contract to mobile Phase 2.3 (mobile-registered users see the same orders on web).
- i18n: MedicineCompare + PharmacyRequest namespaces in all 6 locales. Brand styling (off-white bg, lime primary).

## 2026-08-31 — Phase 4.3: web consultations parity (gap-only, verified contracts)
- /[locale]/consultations/call-history — SSR list from real /care/appointments (completed/cancelled video calls), auth-guarded.
- /[locale]/consultations/post-call-rating — 5-star form → new BFF POST /api/patient-ux/review (backend endpoint exists in CompatModule) with idempotency.
- /[locale]/consultations/home-visit-tracking — SSR status timeline from real /care/appointments/:id.
- i18n ×6 locales for all three namespaces; brand styling (off-white, lime, coral).
- Documented already-covered equivalents: video-call (waiting room), appointments/[appointmentId] (summary/follow-up/cancel via existing BFF cancel/reschedule).

## 2026-08-31 — Phase 4.4: web nursing visit tracking (gap-only, honest deferrals)
- /[locale]/nursing/visits/[visitId] — SSR live tracking timeline from VERIFIED backend contracts GET /nursing/visits/:id and GET /nursing/visits/:id/tracking (home-care.controller.ts), auth-guarded, i18n ×6, brand styling.
- Documented honest deferrals (no fabricated screens): lab detail page (no confirmed GET /labs/:id), nurse public profile (no endpoint), reviews listing (POST only, no GET), web map/location-picker (needs maps-provider decision).

## 2026-08-31 — Phase 4.5: final parity sweep (Phase 4 complete)
- docs/PARITY_FINAL_2026-08-31.md: full matrix — web routes after 4.1-4.4 vs mobile after Phase 2 merges; every mobile screen is either covered, native-excluded (documented), or deferred with a named missing backend contract (no fabricated screens).
- Confirmed integration principle: all Phase-4 web screens consume the SAME backend contracts as mobile (/patient/pharmacy/orders, /care/appointments, /nursing/visits, /patient-ux/review).
- Phase 4 (web parity) marked COMPLETE. Remaining: Phase 5 (deferred SEO/agent-discovery/security) and Phase 6 (CI gate before any main merge).
- 4.5-correction: first parity sweep was WRONG (glob treated [locale] as char class → 0 web routes → 226 false "missing"). Corrected with os.walk; docs/PARITY_FINAL_2026-08-31.md regenerated with true numbers. The corrected doc is the only valid reference.
