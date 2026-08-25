# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/constants/index.ts`
- **Member SHA-256:** `7c55b2ab1acfb565a7ad71046e451dd05024c7abfcbe18933029fe28f2328e2c`
- **Line count:** 443
- **Read range:** `1-443`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `303: SESSION_MIN: 30, LOGIN_MAX_TRIES: 5, LOGIN_LOCK_MIN: 15,`
- `329: login:'تسجيل الدخول', register:'إنشاء حساب', logout:'تسجيل الخروج',`
- `348: next:'التالي', back:'رجوع', save:'حفظ', cancel:'إلغاء', confirm:'تأكيد',`
- `349: delete:'حذف', edit:'تعديل', add:'إضافة', send:'إرسال', submit:'إرسال للمراجعة',`
- `350: close:'إغلاق', done:'تم', skip:'تخطي', retry:'إعادة المحاولة', search:'بحث...',`
- `367: confirmLogout:'هل تريد تسجيل الخروج؟',`
- `386: login:'Log In', register:'Create Account', logout:'Log Out',`
- `388: rememberMe:'Remember Me', biometric:'Login with Face ID / Fingerprint',`
- `401: next:'Next', back:'Back', save:'Save', cancel:'Cancel', confirm:'Confirm',`
- `402: delete:'Delete', edit:'Edit', add:'Add', send:'Send', submit:'Submit for Review',`
- `403: close:'Close', done:'Done', skip:'Skip', retry:'Retry', search:'Search...',`
- `413: confirmLogout:'Are you sure you want to log out?',`
### backend_consumers_or_contracts
- `440: ? (envApiUrl.endsWith('/api/v1') ? envApiUrl : `${envApiUrl.replace(/\/$/, '')}/api/v1`)`
- `442: ? `http://${localIp}:8002/api/v1``
- `443: : 'https://api.nabd.plus/api/v1';`
### auth_ownership
- `219: { id:'inject', ar:'إعطاء حقن طبية', en:'Injection Administration',min:15 },`
- `302: OTP_RESEND_SEC: 60, OTP_MAX_TRIES: 5,`
- `303: SESSION_MIN: 30, LOGIN_MAX_TRIES: 5, LOGIN_LOCK_MIN: 15,`
- `329: login:'تسجيل الدخول', register:'إنشاء حساب', logout:'تسجيل الخروج',`
- `330: forgotPass:'نسيت كلمة المرور؟', resetPass:'استعادة كلمة المرور',`
- `339: // OTP`
- `340: otpTitle:'التحقق من الهوية', otpSentTo:'تم إرسال رمز التحقق إلى',`
- `341: otpResend:'إعادة الإرسال', otpVerify:'تحقق',`
- `367: confirmLogout:'هل تريد تسجيل الخروج؟',`
- `374: sessionExp:'انتهت جلستك. سجّل الدخول مجدداً.',`
- `386: login:'Log In', register:'Create Account', logout:'Log Out',`
- `387: forgotPass:'Forgot Password?', resetPass:'Reset Password',`
### state_transitions
- `37: success: '#34C759', successBg: '#E8F5E9',`
- `44: statusBar: 'dark-content' as const,`
- `54: success: '#3FB950', successBg: 'rgba(63, 185, 80, 0.15)',`
- `61: statusBar: 'light-content' as const,`
- `71: success: string; successBg: string;`
- `78: statusBar: 'dark-content' | 'light-content';`
- `192: { id:'psa', ar:'بروستات PSA', en:'PSA Prostate Antigen', fasting:false, hours:2 },`
- `348: next:'التالي', back:'رجوع', save:'حفظ', cancel:'إلغاء', confirm:'تأكيد',`
- `350: close:'إغلاق', done:'تم', skip:'تخطي', retry:'إعادة المحاولة', search:'بحث...',`
- `351: // Status`
- `352: loading:'جاري التحميل...', success:'تم بنجاح!', error:'حدث خطأ', noData:'لا توجد بيانات',`
- `355: // Status labels`
### payment_insurance_relevance
- `32: card: C.white, inputBg: '#F8F9FA',`
- `49: card: '#161B22', inputBg: '#0D1117',`
- `66: card: string; inputBg: string;`
- `105: // ─── Insurance Companies ──────────────────────────────────────────────────────`
- `118: export const INSURANCE = [`
- `131: { id:'arabia', ar:'العربية للتأمين', en:'Arabia Insurance', plans:['A','B','C'] },`
- `139: { id:'cardio', ar:'أمراض القلب', en:'Cardiology', icon:'heart' },`
- `203: { id:'echo', ar:'إيكو قلب Echocardiography', en:'Echocardiography', prep:false, hours:1 },`
- `305: MIN_PRICE: 10, MAX_PRICE: 99999,`
- `354: dashboard:'الرئيسية', appointments:'المواعيد', chat:'الرسائل', wallet:'المحفظة', settings:'الإعدادات',`
- `405: dashboard:'Home', appointments:'Schedule', chat:'Messages', wallet:'Wallet', settings:'Settings',`
### error_empty_loading_retry_cancel
- `315: TIMEOUT: 30000,`
- `348: next:'التالي', back:'رجوع', save:'حفظ', cancel:'إلغاء', confirm:'تأكيد',`
- `350: close:'إغلاق', done:'تم', skip:'تخطي', retry:'إعادة المحاولة', search:'بحث...',`
- `352: loading:'جاري التحميل...', success:'تم بنجاح!', error:'حدث خطأ', noData:'لا توجد بيانات',`
- `356: online:'متاح الآن', offline:'غير متاح', busy:'مشغول',`
- `357: pending:'قيد المراجعة', active:'نشط', suspended:'موقوف', rejected:'مرفوض',`
- `370: // Errors`
- `375: // Pending`
- `376: pendingTitle:'ملفك قيد المراجعة',`
- `377: pendingBody:'تم استلام ملفك وسيتم مراجعته خلال 24 ساعة',`
- `401: next:'Next', back:'Back', save:'Save', cancel:'Cancel', confirm:'Confirm',`
- `403: close:'Close', done:'Done', skip:'Skip', retry:'Retry', search:'Search...',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
