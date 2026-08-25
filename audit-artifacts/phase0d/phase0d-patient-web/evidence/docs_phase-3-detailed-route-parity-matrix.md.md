# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/phase-3-detailed-route-parity-matrix.md`
- **Member SHA-256:** `5393c5e5a2b9ec256979a2583c98d1fd60e038878ec845654d054cb1acdae2a7`
- **Line count:** 258
- **Read range:** `1-258`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: **الصفوف:** 246 route.`
- `5: **منهج الدليل:** API والتنقل استخرجا ساكناً من ملف route نفسه. الحقول التي تقول إن الدليل غير مباشر لا تعني غياب الميزة؛ بل تمثل نقطة فحص context/child route قبل التنفيذ.**`
- `7: | Source screen/route | Web route المقترح | Action/navigation evidence | Auth/RBAC | API/data evidence | Mandatory states | SEO policy | Web test status | Gap reference |`
- `10: | app/(auth)/login.tsx | /login | /(auth)/forgot-password<br>/(auth)/otp<br>/(auth)/provider-info<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/login<br>/auth/social-login | loading / empty / `
- `11: | app/(auth)/otp.tsx | /otp | /(auth)/provider-info<br>/(auth)/reset-password<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/register<br>/auth/verify-otp | loading / empty / error / unauthorized / forbidden / muta`
- `12: | app/(auth)/privacy.tsx | /privacy | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized`
- `13: | app/(auth)/provider-info.tsx | /provider-info | /(auth)/login<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidd`
- `14: | app/(auth)/register.tsx | /register | /(auth)/login<br>/(auth)/otp<br>/(auth)/privacy<br>/(auth)/provider-info<br>/(auth)/terms<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp<br>/auth/social-login | loa`
- `15: | app/(auth)/reset-password.tsx | /reset-password | /(auth)/login | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/reset-password | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير`
- `16: | app/(auth)/terms.tsx | /terms | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / f`
- `17: | app/(auth)/welcome.tsx | /welcome | /(auth)/login<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/guest | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofoll`
- `18: | app/(onboarding)/index.tsx | / | /(onboarding)/language | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,`
### backend_consumers_or_contracts
- `7: | Source screen/route | Web route المقترح | Action/navigation evidence | Auth/RBAC | API/data evidence | Mandatory states | SEO policy | Web test status | Gap reference |`
- `9: | app/(auth)/forgot-password.tsx | /forgot-password | /(auth)/otp | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير منفذ `
- `10: | app/(auth)/login.tsx | /login | /(auth)/forgot-password<br>/(auth)/otp<br>/(auth)/provider-info<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/login<br>/auth/social-login | loading / empty / `
- `11: | app/(auth)/otp.tsx | /otp | /(auth)/provider-info<br>/(auth)/reset-password<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/register<br>/auth/verify-otp | loading / empty / error / unauthorized / forbidden / muta`
- `14: | app/(auth)/register.tsx | /register | /(auth)/login<br>/(auth)/otp<br>/(auth)/privacy<br>/(auth)/provider-info<br>/(auth)/terms<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp<br>/auth/social-login | loa`
- `15: | app/(auth)/reset-password.tsx | /reset-password | /(auth)/login | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/reset-password | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير`
- `17: | app/(auth)/welcome.tsx | /welcome | /(auth)/login<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/guest | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofoll`
- `22: | app/(tabs)/diagnostics.tsx | /diagnostics | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /labs/packages<br>/labs/services<br>/providers?type=lab<br>/radiology/services | loading /`
- `23: | app/(tabs)/health.tsx | /health | /(tabs)/nursing<br>/consultations/appointments<br>/consultations/waiting-room<br>/health/edit-profile<br>/health/health-id<br>/health/vitals | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /healt`
- `24: | app/(tabs)/index.tsx | / | /(tabs)/consultations<br>/(tabs)/diagnostics<br>/(tabs)/health<br>/(tabs)/pharmacy<br>/ai/triage<br>/consultations/appointment-detail<br>/consultations/appointments<br>/emergency/sos<br>/health/medication-remind`
- `25: | app/(tabs)/nursing.tsx | /nursing | /nursing/service-details<br>/nursing/service-info | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /home-care/packages<br>/home-care/services | loading / empty / error / unauthorized / forbidden`
- `26: | app/(tabs)/pharmacy.tsx | /pharmacy | /pharmacy/barcode-scanner<br>/pharmacy/cart<br>/pharmacy/filters<br>/pharmacy/manual-order<br>/pharmacy/order-history<br>/pharmacy/product-detail<br>/pharmacy/scan-prescription | Patient session مطلوب`
### auth_ownership
- `9: | app/(auth)/forgot-password.tsx | /forgot-password | /(auth)/otp | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير منفذ `
- `10: | app/(auth)/login.tsx | /login | /(auth)/forgot-password<br>/(auth)/otp<br>/(auth)/provider-info<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/login<br>/auth/social-login | loading / empty / `
- `11: | app/(auth)/otp.tsx | /otp | /(auth)/provider-info<br>/(auth)/reset-password<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/register<br>/auth/verify-otp | loading / empty / error / unauthorized / forbidden / muta`
- `12: | app/(auth)/privacy.tsx | /privacy | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized`
- `13: | app/(auth)/provider-info.tsx | /provider-info | /(auth)/login<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidd`
- `14: | app/(auth)/register.tsx | /register | /(auth)/login<br>/(auth)/otp<br>/(auth)/privacy<br>/(auth)/provider-info<br>/(auth)/terms<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp<br>/auth/social-login | loa`
- `15: | app/(auth)/reset-password.tsx | /reset-password | /(auth)/login | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/reset-password | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير`
- `16: | app/(auth)/terms.tsx | /terms | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / f`
- `17: | app/(auth)/welcome.tsx | /welcome | /(auth)/login<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/guest | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofoll`
- `20: | app/(onboarding)/permissions.tsx | /permissions | /(auth)/welcome | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending `
- `21: | app/(tabs)/consultations/index.tsx | /consultations | /ai-assistant<br>/consultations/doctor-search<br>/consultations/specialty-select<br>/offers | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /care/specialties<br>/home/offers<b`
- `22: | app/(tabs)/diagnostics.tsx | /diagnostics | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /labs/packages<br>/labs/services<br>/providers?type=lab<br>/radiology/services | loading /`
### state_transitions
- `7: | Source screen/route | Web route المقترح | Action/navigation evidence | Auth/RBAC | API/data evidence | Mandatory states | SEO policy | Web test status | Gap reference |`
- `9: | app/(auth)/forgot-password.tsx | /forgot-password | /(auth)/otp | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير منفذ `
- `10: | app/(auth)/login.tsx | /login | /(auth)/forgot-password<br>/(auth)/otp<br>/(auth)/provider-info<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/login<br>/auth/social-login | loading / empty / `
- `11: | app/(auth)/otp.tsx | /otp | /(auth)/provider-info<br>/(auth)/reset-password<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/register<br>/auth/verify-otp | loading / empty / error / unauthorized / forbidden / muta`
- `12: | app/(auth)/privacy.tsx | /privacy | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized`
- `13: | app/(auth)/provider-info.tsx | /provider-info | /(auth)/login<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidd`
- `14: | app/(auth)/register.tsx | /register | /(auth)/login<br>/(auth)/otp<br>/(auth)/privacy<br>/(auth)/provider-info<br>/(auth)/terms<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp<br>/auth/social-login | loa`
- `15: | app/(auth)/reset-password.tsx | /reset-password | /(auth)/login | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/reset-password | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير`
- `16: | app/(auth)/terms.tsx | /terms | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / f`
- `17: | app/(auth)/welcome.tsx | /welcome | /(auth)/login<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/guest | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofoll`
- `18: | app/(onboarding)/index.tsx | / | /(onboarding)/language | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,`
- `19: | app/(onboarding)/language.tsx | /language | /(auth)/welcome | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending | noin`
### payment_insurance_relevance
- `21: | app/(tabs)/consultations/index.tsx | /consultations | /ai-assistant<br>/consultations/doctor-search<br>/consultations/specialty-select<br>/offers | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /care/specialties<br>/home/offers<b`
- `41: | app/consultations/appointment-detail.tsx | /consultations/appointment-detail | /consultations/cancel-reschedule<br>/consultations/clinic-location<br>/consultations/doctor/[id]<br>/consultations/home-visit-tracking<br>/consultations/summar`
- `44: | app/consultations/booking-confirm.tsx | /consultations/booking-confirm | /consultations/booking-success<br>/insurance/payment-split<br>/payments/processing<br>/profile/insurance | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /in`
- `59: | app/consultations/offer/[id].tsx | /consultations/offer/:id | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / em`
- `75: | app/diagnostics/insurance-approval.tsx | /diagnostics/insurance-approval | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | لا استدعاء ثابت مباشر؛ راجع context/component/child route |`
- `76: | app/diagnostics/insurance-upload.tsx | /diagnostics/insurance-upload | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /ai/ocr-translate<br>/insurance/companies<br>/orders/create<br>`
- `134: | app/insurance/add-policy.tsx | /insurance/add-policy | /insurance/hub | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /insurance/companies<br>/insurance/ocr-extract<br>/insurance/save-policy | loading / empty / error / unauthoriz`
- `135: | app/insurance/approval-pending.tsx | /insurance/approval-pending | /(tabs)/consultations<br>/insurance/claim-tracking<br>/payments/processing | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /insurance/requests/my<br>/users/me/pro`
- `136: | app/insurance/benefits-summary.tsx | /insurance/benefits-summary | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /insurance/benefits-summary | loading / empty / error / unauthorize`
- `137: | app/insurance/claim-tracking.tsx | /insurance/claim-tracking | /insurance/refund-status<br>/insurance/submit-claim<br>/support/chat | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | /insurance/claims/my | loading / empty / error / `
- `138: | app/insurance/copay.tsx | /insurance/copay | /payments/processing | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mu`
- `139: | app/insurance/coverage-check.tsx | /insurance/coverage-check | /support/chat | Patient session مطلوبة؛ RBAC/ownership يثبتان من API | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / for`
### error_empty_loading_retry_cancel
- `9: | app/(auth)/forgot-password.tsx | /forgot-password | /(auth)/otp | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير منفذ `
- `10: | app/(auth)/login.tsx | /login | /(auth)/forgot-password<br>/(auth)/otp<br>/(auth)/provider-info<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/login<br>/auth/social-login | loading / empty / `
- `11: | app/(auth)/otp.tsx | /otp | /(auth)/provider-info<br>/(auth)/reset-password<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/register<br>/auth/verify-otp | loading / empty / error / unauthorized / forbidden / muta`
- `12: | app/(auth)/privacy.tsx | /privacy | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized`
- `13: | app/(auth)/provider-info.tsx | /provider-info | /(auth)/login<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidd`
- `14: | app/(auth)/register.tsx | /register | /(auth)/login<br>/(auth)/otp<br>/(auth)/privacy<br>/(auth)/provider-info<br>/(auth)/terms<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/send-otp<br>/auth/social-login | loa`
- `15: | app/(auth)/reset-password.tsx | /reset-password | /(auth)/login | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/reset-password | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofollow | غير`
- `16: | app/(auth)/terms.tsx | /terms | عرض/استخدام context فقط أو يتطلب فحصاً وظيفياً | Public؛ يتحول إلى authenticated عند نجاح session فقط | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / f`
- `17: | app/(auth)/welcome.tsx | /welcome | /(auth)/login<br>/(auth)/register<br>/(tabs) | Public؛ يتحول إلى authenticated عند نجاح session فقط | /auth/guest | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,nofoll`
- `18: | app/(onboarding)/index.tsx | / | /(onboarding)/language | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending | noindex,`
- `19: | app/(onboarding)/language.tsx | /language | /(auth)/welcome | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending | noin`
- `20: | app/(onboarding)/permissions.tsx | /permissions | /(auth)/welcome | Public bootstrap؛ لا يمثل صلاحية طبية | لا استدعاء ثابت مباشر؛ راجع context/component/child route | loading / empty / error / unauthorized / forbidden / mutation pending `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
