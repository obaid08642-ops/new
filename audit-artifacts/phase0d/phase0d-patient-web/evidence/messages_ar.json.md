# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `messages/ar.json`
- **Member SHA-256:** `3d80b81e44f9b506dbd47eb62d703357f06b880ee5a638f3a8748f5ec6db6bc8`
- **Line count:** 818
- **Read range:** `1-818`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: "Login": {`
- `29: "submit": "دخول آمن",`
- `30: "submitting": "جارٍ التحقق…",`
- `33: "twoFactorSubmit": "تحقق من الرمز",`
- `34: "twoFactorSubmitting": "جارٍ التحقق…",`
- `46: "otpSubmitting": "جارٍ تأمين الدخول…",`
- `133: "cancelAppointment": "إلغاء الموعد",`
- `134: "cancelConfirm": "هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟",`
- `135: "cancelReason": "السبب (اختياري)",`
- `137: "confirmCancel": "تأكيد الإلغاء",`
- `138: "cancelConflict": "لم يعد من الممكن إلغاء هذا الموعد.",`
- `139: "cancelFailed": "لم يُلغَ الموعد.",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: "Login": {`
- `42: "useOtp": "استخدام رمز لمرة واحدة",`
- `44: "otpRequest": "إرسال رمز لمرة واحدة",`
- `45: "otpVerify": "تحقق من الرمز",`
- `46: "otpSubmitting": "جارٍ تأمين الدخول…",`
- `47: "otpCode": "الرمز لمرة واحدة",`
- `48: "otpCodeBody": "أدخل الرمز المكون من ستة أرقام الذي أرسلته خدمة المصادقة الآمنة.",`
- `49: "otpSent": "تم طلب رمز لمرة واحدة. راجع وسيلة التواصل المعتمدة.",`
- `50: "otpRequestInvalid": "تعذر طلب الرمز. راجع المعرّف وحاول مرة أخرى.",`
- `51: "otpInvalid": "لم يتم قبول الرمز. حاول مرة أخرى.",`
- `52: "otpExchangeInvalid": "تعذر إنشاء الجلسة الآمنة. لم تُنشأ جلسة محلية.",`
- `53: "otpUnavailable": "خدمة المصادقة غير متاحة. لم تُنشأ جلسة."`
### state_transitions
- `59: "loading": "جارٍ تحميل بوابة المريض",`
- `78: "empty": "لا توجد طلبات متاحة لهذا الحساب حالياً.",`
- `80: "statusUnavailable": "الحالة غير متاحة",`
- `83: "status": "الحالة",`
- `99: "empty": "سلتك فارغة.",`
- `113: "empty": "لا توجد مواعيد متاحة لهذا الحساب حالياً.",`
- `115: "statusUnavailable": "الحالة غير متاحة",`
- `119: "status": "الحالة",`
- `133: "cancelAppointment": "إلغاء الموعد",`
- `134: "cancelConfirm": "هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟",`
- `135: "cancelReason": "السبب (اختياري)",`
- `137: "confirmCancel": "تأكيد الإلغاء",`
### payment_insurance_relevance
- `91: "total": "الإجمالي",`
- `101: "subtotal": "المجموع الفرعي",`
- `103: "total": "الإجمالي",`
- `155: "callDiscard": "إلغاء الجلسة"`
- `327: "insurance": "التأمين",`
- `404: "Insurance": {`
- `500: "sessionsSummary": "يُعرض أول {shown} من أصل {total} جلسة نشطة."`
- `514: "offers": "عروض وخصومات",`
- `525: "offers": "عروض على الخدمات والمنتجات",`
- `673: "price": "{value} ر.س",`
- `674: "priceLabel": "السعر",`
- `676: "insurance": "يقبل التأمين",`
### error_empty_loading_retry_cancel
- `59: "loading": "جارٍ تحميل بوابة المريض",`
- `78: "empty": "لا توجد طلبات متاحة لهذا الحساب حالياً.",`
- `99: "empty": "سلتك فارغة.",`
- `113: "empty": "لا توجد مواعيد متاحة لهذا الحساب حالياً.",`
- `133: "cancelAppointment": "إلغاء الموعد",`
- `134: "cancelConfirm": "هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟",`
- `135: "cancelReason": "السبب (اختياري)",`
- `137: "confirmCancel": "تأكيد الإلغاء",`
- `138: "cancelConflict": "لم يعد من الممكن إلغاء هذا الموعد.",`
- `139: "cancelFailed": "لم يُلغَ الموعد.",`
- `140: "cancelUnavailable": "خدمة الإلغاء غير متاحة.",`
- `145: "rescheduleCancel": "الاحتفاظ بالوقت الحالي",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
