# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/i18n/medications.ts`
- **Member SHA-256:** `facd70fec7528ba5478455095d7dbbb3eb85a92b74e67fb17d6ffd9862e771da`
- **Line count:** 53
- **Read range:** `1-53`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: title: 'أدويتي', loading: 'جارٍ تحميل أدويتك…', retry: 'إعادة المحاولة', add: 'إضافة', addReminder: 'إضافة تذكير',`
- `22: title: 'My medications', loading: 'Loading your medications…', retry: 'Try again', add: 'Add', addReminder: 'Add reminder',`
- `31: chronicTitle: 'Chronic medicines', chronicNotice: 'This page helps track records and refills. It never creates an order or changes a prescription automatically.', noChronic: 'No active chronic medicines', noChronicHint: 'Add a reminder and `
- `35: title: 'میری دوائیں', loading: 'دوائیں لوڈ ہو رہی ہیں…', retry: 'دوبارہ کوشش', add: 'شامل کریں', addReminder: 'یاد دہانی شامل کریں', dailyPlan: 'آج کا منصوبہ', doseProgress: 'آج {scheduled} میں سے {taken} خوراکیں درج ہوئیں', noDoseToday: 'آ`
- `38: title: 'मेरी दवाइयाँ', loading: 'दवाइयाँ लोड हो रही हैं…', retry: 'फिर प्रयास करें', add: 'जोड़ें', addReminder: 'रिमाइंडर जोड़ें', dailyPlan: 'आज की योजना', doseProgress: 'आज {scheduled} में से {taken} खुराक दर्ज', noDoseToday: 'आज कोई खुर`
- `41: title: 'আমার ওষুধ', loading: 'ওষুধ লোড হচ্ছে…', retry: 'আবার চেষ্টা করুন', add: 'যোগ করুন', addReminder: 'রিমাইন্ডার যোগ করুন', dailyPlan: 'আজকের পরিকল্পনা', doseProgress: 'আজ {scheduled}টির মধ্যে {taken} ডোজ নথিভুক্ত', noDoseToday: 'আজ কোন`
- `44: title: 'Aking mga gamot', loading: 'Nilo-load ang mga gamot…', retry: 'Subukan muli', add: 'Magdagdag', addReminder: 'Magdagdag ng paalala', dailyPlan: 'Plano ngayong araw', doseProgress: '{taken} sa {scheduled} dose ang naitala ngayon', no`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `19: doseOf: '{name} · {dose}', doseTime: '{time}', daysLeft: 'متبقي {days} يوم', unitsLeft: '{count} وحدة', allCaughtUp: 'لا توجد جرعات معلقة اليوم', medicineUnnamed: 'دواء غير مسمى', doseUnrecorded: 'الجرعة غير مسجلة', deviceAlerts: 'تنبيهات ه`
- `32: doseOf: '{name} · {dose}', doseTime: '{time}', daysLeft: '{days} days left', unitsLeft: '{count} units', allCaughtUp: 'No pending doses today', medicineUnnamed: 'Unnamed medicine', doseUnrecorded: 'Dose not recorded', deviceAlerts: 'This de`
- `35: title: 'میری دوائیں', loading: 'دوائیں لوڈ ہو رہی ہیں…', retry: 'دوبارہ کوشش', add: 'شامل کریں', addReminder: 'یاد دہانی شامل کریں', dailyPlan: 'آج کا منصوبہ', doseProgress: 'آج {scheduled} میں سے {taken} خوراکیں درج ہوئیں', noDoseToday: 'آ`
- `38: title: 'मेरी दवाइयाँ', loading: 'दवाइयाँ लोड हो रही हैं…', retry: 'फिर प्रयास करें', add: 'जोड़ें', addReminder: 'रिमाइंडर जोड़ें', dailyPlan: 'आज की योजना', doseProgress: 'आज {scheduled} में से {taken} खुराक दर्ज', noDoseToday: 'आज कोई खुर`
- `41: title: 'আমার ওষুধ', loading: 'ওষুধ লোড হচ্ছে…', retry: 'আবার চেষ্টা করুন', add: 'যোগ করুন', addReminder: 'রিমাইন্ডার যোগ করুন', dailyPlan: 'আজকের পরিকল্পনা', doseProgress: 'আজ {scheduled}টির মধ্যে {taken} ডোজ নথিভুক্ত', noDoseToday: 'আজ কোন`
- `44: title: 'Aking mga gamot', loading: 'Nilo-load ang mga gamot…', retry: 'Subukan muli', add: 'Magdagdag', addReminder: 'Magdagdag ng paalala', dailyPlan: 'Plano ngayong araw', doseProgress: '{taken} sa {scheduled} dose ang naitala ngayon', no`
### state_transitions
- `8: title: 'أدويتي', loading: 'جارٍ تحميل أدويتك…', retry: 'إعادة المحاولة', add: 'إضافة', addReminder: 'إضافة تذكير',`
- `12: reminderTitle: 'تذكيرات الدواء', nextDose: 'الموعد التالي', dosesLogged: 'جرعات اليوم المسجلة', doseTimeline: 'تسلسل جرعات اليوم', due: 'مستحقة الآن', pending: 'بانتظار التسجيل', taken: 'تم أخذها', skipped: 'تم التخطي', missed: 'فات موعدها'`
- `14: doseSafety: 'اتبع وصفتك أو تعليمات مقدم الرعاية. لا تضف أو تعدّل الجرعة هنا من دون الرجوع إليهم.', logError: 'تعذر تسجيل نتيجة الجرعة. لم تتغير حالتها.', stopError: 'تعذر تحديث حالة التذكير.',`
- `17: refillTracking: 'متابعة إعادة التعبئة', remainingUnits: 'عدد الوحدات المتبقية (اختياري)', refillDate: 'تاريخ المتابعة YYYY-MM-DD (اختياري)', refillHint: 'إعادة التعبئة تتطلب مراجعة الطلب والعنوان؛ لا ينشئ التطبيق طلباً أو يعدل الوصفة تلقائي`
- `18: chronicTitle: 'الأدوية المزمنة', chronicNotice: 'تساعدك هذه الصفحة على متابعة السجل وإعادة التعبئة. لا تنشئ طلباً تلقائياً ولا تعدل وصفة أو جرعة.', noChronic: 'لا توجد أدوية مزمنة نشطة', noChronicHint: 'أضف تذكيراً وحدد «دواء مزمن» إذا كان `
- `19: doseOf: '{name} · {dose}', doseTime: '{time}', daysLeft: 'متبقي {days} يوم', unitsLeft: '{count} وحدة', allCaughtUp: 'لا توجد جرعات معلقة اليوم', medicineUnnamed: 'دواء غير مسمى', doseUnrecorded: 'الجرعة غير مسجلة', deviceAlerts: 'تنبيهات ه`
- `22: title: 'My medications', loading: 'Loading your medications…', retry: 'Try again', add: 'Add', addReminder: 'Add reminder',`
- `25: reminderTitle: 'Medication reminders', nextDose: 'Next dose', dosesLogged: 'Today’s logged doses', doseTimeline: 'Today’s dose timeline', due: 'Due now', pending: 'Waiting to be logged', taken: 'Taken', skipped: 'Skipped', missed: 'Missed',`
- `27: doseSafety: 'Follow your prescription or care provider’s instructions. Do not add or change a dose here without them.', logError: 'The dose result could not be logged. Its status has not changed.', stopError: 'The reminder status could not `
- `29: schedule: 'Schedule', timeZone: 'Time zone', timeZoneHint: 'The time zone keeps a dose in the correct local day. It does not confirm a device notification was delivered.', frequencyAndDuration: 'Frequency and duration', daily: 'Daily', week`
- `30: refillTracking: 'Refill tracking', remainingUnits: 'Units remaining (optional)', refillDate: 'Follow-up date YYYY-MM-DD (optional)', refillHint: 'A refill needs order and address review. The app does not create an order or change a prescrip`
- `31: chronicTitle: 'Chronic medicines', chronicNotice: 'This page helps track records and refills. It never creates an order or changes a prescription automatically.', noChronic: 'No active chronic medicines', noChronicHint: 'Add a reminder and `
### payment_insurance_relevance
- `44: title: 'Aking mga gamot', loading: 'Nilo-load ang mga gamot…', retry: 'Subukan muli', add: 'Magdagdag', addReminder: 'Magdagdag ng paalala', dailyPlan: 'Plano ngayong araw', doseProgress: '{taken} sa {scheduled} dose ang naitala ngayon', no`
### error_empty_loading_retry_cancel
- `8: title: 'أدويتي', loading: 'جارٍ تحميل أدويتك…', retry: 'إعادة المحاولة', add: 'إضافة', addReminder: 'إضافة تذكير',`
- `12: reminderTitle: 'تذكيرات الدواء', nextDose: 'الموعد التالي', dosesLogged: 'جرعات اليوم المسجلة', doseTimeline: 'تسلسل جرعات اليوم', due: 'مستحقة الآن', pending: 'بانتظار التسجيل', taken: 'تم أخذها', skipped: 'تم التخطي', missed: 'فات موعدها'`
- `14: doseSafety: 'اتبع وصفتك أو تعليمات مقدم الرعاية. لا تضف أو تعدّل الجرعة هنا من دون الرجوع إليهم.', logError: 'تعذر تسجيل نتيجة الجرعة. لم تتغير حالتها.', stopError: 'تعذر تحديث حالة التذكير.',`
- `17: refillTracking: 'متابعة إعادة التعبئة', remainingUnits: 'عدد الوحدات المتبقية (اختياري)', refillDate: 'تاريخ المتابعة YYYY-MM-DD (اختياري)', refillHint: 'إعادة التعبئة تتطلب مراجعة الطلب والعنوان؛ لا ينشئ التطبيق طلباً أو يعدل الوصفة تلقائي`
- `18: chronicTitle: 'الأدوية المزمنة', chronicNotice: 'تساعدك هذه الصفحة على متابعة السجل وإعادة التعبئة. لا تنشئ طلباً تلقائياً ولا تعدل وصفة أو جرعة.', noChronic: 'لا توجد أدوية مزمنة نشطة', noChronicHint: 'أضف تذكيراً وحدد «دواء مزمن» إذا كان `
- `19: doseOf: '{name} · {dose}', doseTime: '{time}', daysLeft: 'متبقي {days} يوم', unitsLeft: '{count} وحدة', allCaughtUp: 'لا توجد جرعات معلقة اليوم', medicineUnnamed: 'دواء غير مسمى', doseUnrecorded: 'الجرعة غير مسجلة', deviceAlerts: 'تنبيهات ه`
- `22: title: 'My medications', loading: 'Loading your medications…', retry: 'Try again', add: 'Add', addReminder: 'Add reminder',`
- `25: reminderTitle: 'Medication reminders', nextDose: 'Next dose', dosesLogged: 'Today’s logged doses', doseTimeline: 'Today’s dose timeline', due: 'Due now', pending: 'Waiting to be logged', taken: 'Taken', skipped: 'Skipped', missed: 'Missed',`
- `27: doseSafety: 'Follow your prescription or care provider’s instructions. Do not add or change a dose here without them.', logError: 'The dose result could not be logged. Its status has not changed.', stopError: 'The reminder status could not `
- `30: refillTracking: 'Refill tracking', remainingUnits: 'Units remaining (optional)', refillDate: 'Follow-up date YYYY-MM-DD (optional)', refillHint: 'A refill needs order and address review. The app does not create an order or change a prescrip`
- `31: chronicTitle: 'Chronic medicines', chronicNotice: 'This page helps track records and refills. It never creates an order or changes a prescription automatically.', noChronic: 'No active chronic medicines', noChronicHint: 'Add a reminder and `
- `32: doseOf: '{name} · {dose}', doseTime: '{time}', daysLeft: '{days} days left', unitsLeft: '{count} units', allCaughtUp: 'No pending doses today', medicineUnnamed: 'Unnamed medicine', doseUnrecorded: 'Dose not recorded', deviceAlerts: 'This de`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
