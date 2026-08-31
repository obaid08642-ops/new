# خطة إصلاح الفجوات وتقليص رحلات المستخدم — 2026-08-31
المصدر: تدقيق كود فعلي لـ patient-app (242 شاشة / 193 استدعاء API / 97 هدف تنقّل) و provider-app (45+ شاشة).

## المرحلة A — تحقق البيانات الحرج (أولوية قصوى، يحدد وهمي/حقيقي)
- A1: التحقق من وجود endpoints خلفية لكل استدعاء في: health (32 API — الأكبر), nutrition (6), maternity (2), payments (0 API في الشاشات!), nursing (1 API فقط).
- A2: مطابقة كل مسار API في patient-app مع controllers في backend/src/modules — قائمة اليتيم (frontend ينادي backend غير موجود) والعكس.
- A3: فحص ~15 شاشة بعلامات hardcoded (مصفوفات عربية ثابتة/mock/demo): consultations(4), settings(4), pharmacy(4), auth(3), tabs(3) — استبدال أي بيانات مخترعة بجلب حقيقي أو توثيق مشروعيتها.

## المرحلة B — تقليص ودمج شاشات المريض (~15 شاشة)
- B1 حذف المكرر حرفياً (−3): دمج pharmacy/chat-with-pharmacist في pharmacist-chat؛ waiting-room في virtual-waiting-room؛ payments/failure في payments/failed. مع redirects.
- B2 شاشة حالة حجز موحدة (−2): booking-confirm/pending/success → booking-status واحدة ديناميكية.
- B3 طلب دواء غير موجود موحد (−2): drug-not-found + custom-item + manual-order → pharmacy/request واحدة.
- B4 صفحة عيادة واحدة (−2): clinic/[id] + clinic-location + clinic-confirm → صفحة بخريطة وتأكيد مدمجين.
- B5 شاشة نتيجة دفع موحدة (−2): payments/processing+success+failed → واحدة تقرأ الحالة من API (يعالج فجوة 0-API).
- B6 بطاقة تغطية تأمين موحدة (−1): coverage-check + benefits-summary.
- B7 مركز طوارئ موحد (−1): emergency/* + mental-health/crisis-contacts.
- B8 بحث عالمي موحد بتبويبات (−2): search + product-search + doctor-search + drug-scanner (رفع صورة).
- النتيجة المستهدفة: شراء دواء 7→4 خطوات؛ حجز استشارة 8→5 خطوات.
- بعد كل دمج: تحديث كل router.push المشيرة، حذف القديم، اختبارات مسار، commit+push منفصل.

## المرحلة C — تنظيف تطبيق المزود
- C1: حذف BlueprintScreens.tsx الميتة بعد التحقق أن RealScreens/RealScreensExtended بدّلتها فعلاً.
- C2: فحص شاشات بلا شبكة (ProviderHome, DoctorHeader/QueueList/StatsRow/UrgentRequests): إما تتغذى من الأب (توثيق) أو ربطها بـ API حقيقي.
- C3: تدقيق يدوي لملف Navigator/App الرئيسي وبناء خريطة تنقل كاملة موثقة.
- C4: التحقق من رحلة تسجيل كل تخصص → PendingDashboard → تفعيل، وسد أي حلقة مفقودة.

## المرحلة D — بناء شاشات الويب الناقصة (~28) بالرحلات المختصرة
- D1: payments (3) ← D2: pharmacy (~10) ← D3: consultations (~8، بشاشة الحالة الموحدة لا الثلاث) ← D4: nursing/diagnostics/متفرقات (~6) ← D5: تحقق تكامل لكل شاشة موجودة مقابل الموبايل.

## المرحلة E — بوابة الجودة (محجوبة بيئياً، تُنفذ في CI)
- E1: npm ci --legacy-peer-deps في بيئة سليمة → typecheck + tests + build لكل تعديل.
- E2: لا دمج إلى main إلا بإشارة المستخدم وبعد اجتياز E1.

## قواعد ثابتة
- لا بيانات وهمية؛ أي شاشة بدون backend حقيقي تُعلَّم وتُحسم (ربط/حذف) ولا تُترك رمادية.
- كل مرحلة = commit مستقل + push + تحقق SHA محلي=بعيد.
- main لا يُمس. الدمج للمراجع فقط.
