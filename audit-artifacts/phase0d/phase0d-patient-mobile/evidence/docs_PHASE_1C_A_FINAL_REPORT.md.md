# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/PHASE_1C_A_FINAL_REPORT.md`
- **Member SHA-256:** `8877a1e2110b688395638810f062b0f2651cec48e95d78b2c900f83e4971a2db`
- **Line count:** 53
- **Read range:** `1-53`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: - **Forced Logout from Admin**: دالة مخصصة لعمليات الطرد من لوحة التحكم.`
- `36: - **المدخلات المسجلة:** (Device ID, Session ID, Login Method, IP Address, Timestamp, Failure/Logout Reason).`
### backend_consumers_or_contracts
- `46: - `/docs/AUTHENTICATION.md``
### auth_ownership
- `12: - **الدوال المدعومة:** `signIn`, `signUp`, `signOut`, `refreshToken`, `revokeSession`, `deleteAccount`, `resetPassword`, `verifyOTP`, `linkProvider`, `unlinkProvider`.`
- `15: ## 2. أمان الجلسات (Session Security)`
- `16: - **الإنجاز:** تم ترقية `SessionManager` لدعم أقصى درجات الأمان.`
- `18: - **Refresh Token Rotation**: التوكن يتجدد باستمرار وتُلغى النسخ القديمة.`
- `19: - **Token Refresh Queue**: إضافة طابور (Promise Queue) لمنع تعارض طلبات التحديث المتزامنة.`
- `20: - **Absolute Session Lifetime**: إنهاء قسري للجلسة بعد 14 يوماً بغض النظر عن الاستخدام.`
- `21: - **Session Versioning**: إمكانية الإبطال الشامل للجلسات عن بُعد.`
- `22: - **Forced Logout from Admin**: دالة مخصصة لعمليات الطرد من لوحة التحكم.`
- `26: - **الفائدة:** تم التأكد بشكل قاطع من عدم تخزين أي Tokens أو بيانات حساسة داخل `AsyncStorage`. كافة البيانات تُحفظ في الـ (Keychain/Keystore) الخاصة بالنظام والمشفرة أصلياً.`
- `36: - **المدخلات المسجلة:** (Device ID, Session ID, Login Method, IP Address, Timestamp, Failure/Logout Reason).`
- `37: - **القيود:** تم ضمان **عدم تسجيل أي أسرار** (كلمات مرور أو رموز OTP) في سجلات التدقيق أبداً.`
- `41: - **Unit Testing**: تمت كتابة سيناريوهات اختبار شاملة تغطي محاولات تسجيل الدخول، القفل (Account Lockout)، سياسات كلمات المرور (Password Policy)، وإدارة الجلسات (Session Manager).`
### state_transitions
- `3: **Status:** 🟢 **FULLY COMPLETED & VERIFIED**`
- `43: - `tsc --noEmit`: **✅ 0 Errors**`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `43: - `tsc --noEmit`: **✅ 0 Errors**`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
