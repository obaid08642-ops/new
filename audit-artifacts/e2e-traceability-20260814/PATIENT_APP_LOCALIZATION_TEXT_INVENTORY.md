# جرد نصوص تطبيق المريض للتوطين

**الحالة:** جرد آلي للمرشحات؛ لا يعد كل تطابق نص واجهة نهائياً حتى يراجع سياق الشاشة.
**المصدر:** 479 ملفاً من app/ وsrc/.
**النتيجة:** 4422 تطابقاً عربياً، 3272 نصاً فريداً مرشحاً للتوطين.

## توزيع المرشحات حسب الملف

| الملف | عدد المرشحات |
|---|---:|
| src/i18n/index.ts | 549 |
| app/maternity/baby-development.tsx | 362 |
| src/constants/specialties.ts | 286 |
| src/constants/insurance.ts | 165 |
| src/data/fetus-data.ts | 80 |
| app/consultations/doctor/[id].tsx | 62 |
| app/ai/symptom-checker.tsx | 60 |
| app/returns/new-request.tsx | 53 |
| app/ai/skin-analysis.tsx | 52 |
| app/(tabs)/consultations/index.tsx | 45 |
| app/health/conditions-allergies.tsx | 40 |
| app/ai/prescription-translator.tsx | 39 |
| app/consultations/offer/[id].tsx | 39 |
| app/nutrition/ai-plan-builder.tsx | 39 |
| app/diagnostics/checkout.tsx | 37 |
| app/health/smart-reminders.tsx | 37 |
| app/ai/monthly-report.tsx | 36 |
| app/consultations/booking-confirm.tsx | 34 |
| app/nutrition/exercise-plan.tsx | 33 |
| app/consultations/doctor-profile.tsx | 31 |
| app/health/medication-reminder-add.tsx | 30 |
| app/returns/detail.tsx | 30 |
| app/pharmacy/filters.tsx | 29 |
| app/reports/ai-analysis.tsx | 29 |
| app/consultations/cancel-reschedule.tsx | 28 |
| app/family/permissions.tsx | 28 |
| app/settings/notifications.tsx | 28 |
| app/diagnostics/sample-tracking.tsx | 27 |
| app/health/sleep-score.tsx | 27 |
| app/notifications/index.tsx | 27 |
| app/maternity/maternity-setup.tsx | 26 |
| app/voice/index.tsx | 26 |
| app/consultations/appointment-detail.tsx | 25 |
| app/diagnostics/order/[id].tsx | 25 |
| app/health/vitals-log.tsx | 25 |
| app/nutrition/ai-meal-planner.tsx | 25 |
| app/nutrition/body-target.tsx | 25 |
| app/search/index.tsx | 25 |
| app/(tabs)/services.tsx | 23 |
| app/diagnostics/booking-confirm.tsx | 23 |
| app/insurance/hub.tsx | 22 |
| app/nutrition/hub.tsx | 22 |
| app/reports/hub.tsx | 22 |
| app/(tabs)/index.tsx | 21 |
| app/maternity/ovulation-tracker.tsx | 21 |
| app/programs/active.tsx | 21 |
| app/health/health-id.tsx | 20 |
| app/map/index.tsx | 20 |
| app/(auth)/register.tsx | 19 |
| app/family/calendar.tsx | 19 |
| app/family/shared-calendar.tsx | 19 |
| app/health/sleep-tracker.tsx | 19 |
| app/loyalty/referrals.tsx | 19 |
| app/nutrition/food-scanner.tsx | 19 |
| app/pharmacy/drug-not-found.tsx | 19 |
| app/pharmacy/rx-order.tsx | 19 |
| app/wallet/transfer.tsx | 19 |
| app/insurance/coverage-check.tsx | 18 |
| app/pharmacy/checkout.tsx | 18 |
| app/settings/notifications-settings.tsx | 18 |
| app/(tabs)/diagnostics.tsx | 17 |
| app/health/vitals.tsx | 17 |
| app/consultations/prescription-from-doctor.tsx | 16 |
| app/nursing/live-tracking.tsx | 16 |
| app/profile/index.tsx | 16 |
| app/returns/hub.tsx | 16 |
| app/wallet/cards.tsx | 16 |
| app/health/family-hub.tsx | 15 |
| app/maternity/hub.tsx | 15 |
| app/mental-health/therapist-match.tsx | 15 |
| app/nutrition/calorie-analyzer.tsx | 15 |
| app/pharmacy/chat-with-pharmacist.tsx | 15 |
| app/pharmacy/product-detail.tsx | 15 |
| src/services/PermissionsManager.ts | 15 |
| app/(tabs)/health.tsx | 14 |
| app/community/hub.tsx | 14 |
| app/emergency/sos-active.tsx | 14 |
| app/family/hub.tsx | 14 |
| app/family/member-health.tsx | 14 |
| app/insurance/policy-detail.tsx | 14 |
| app/mental-health/hub.tsx | 14 |
| app/nutrition/daily-tracker.tsx | 14 |
| app/pharmacy/cart.tsx | 14 |
| app/reports/passport.tsx | 14 |
| app/settings/index.tsx | 14 |
| app/shared/location-picker.tsx | 14 |
| src/services/ErrorHandler.tsx | 14 |
| app/(auth)/login.tsx | 13 |
| app/consultations/appointments.tsx | 13 |
| app/consultations/follow-up.tsx | 13 |
| app/consultations/share-report.tsx | 13 |
| app/family/permission-request.tsx | 13 |
| app/health/trends.tsx | 13 |
| app/insurance/payment-split.tsx | 13 |
| app/nutrition/log-meal.tsx | 13 |
| app/pharmacy/medicine-compare.tsx | 13 |
| app/settings/security.tsx | 13 |
| app/wallet/topup.tsx | 13 |
| app/(onboarding)/index.tsx | 12 |
| app/consultations/call-history.tsx | 12 |
| app/family/invite.tsx | 12 |
| app/health/medications.tsx | 12 |
| app/health/refills.tsx | 12 |
| app/loyalty/rewards.tsx | 12 |
| app/mental-health/breathing.tsx | 12 |
| app/mental-health/crisis-support.tsx | 12 |
| app/pharmacy/reorder.tsx | 12 |
| src/design-system/components/States.tsx | 12 |
| app/ai/symptom-timeline.tsx | 11 |
| app/consultations/booking-success.tsx | 11 |
| app/consultations/specialty-select.tsx | 11 |
| app/diagnostics/book-sample.tsx | 11 |
| app/mental-health/meditation.tsx | 11 |
| app/offers/[id].tsx | 11 |
| app/pharmacy/custom-item.tsx | 11 |
| app/pharmacy/order-tracking.tsx | 11 |
| app/settings/about.tsx | 11 |
| app/wallet/transactions.tsx | 11 |
| src/design-system/components/SearchBar.tsx | 11 |
| app/ai/chat-doctor.tsx | 10 |
| app/diagnostics/technician-tracking.tsx | 10 |
| app/family/join.tsx | 10 |
| app/health/edit-profile.tsx | 10 |
| app/insurance/copay.tsx | 10 |
| app/loyalty/hub.tsx | 10 |
| app/maternity/pregnancy-tracker.tsx | 10 |
| app/nursing/live-doctor-tracking.tsx | 10 |
| app/payments/success.tsx | 10 |
| app/pharmacy/barcode-scanner.tsx | 10 |
| app/reports/view-report.tsx | 10 |
| app/settings/privacy.tsx | 10 |
| app/(auth)/otp.tsx | 9 |
| app/(onboarding)/permissions.tsx | 9 |
| app/community/post-detail.tsx | 9 |
| app/consultations/doctor-search.tsx | 9 |
| app/diagnostics/insurance-approval.tsx | 9 |
| app/diagnostics/my-results.tsx | 9 |
| app/diagnostics/orders.tsx | 9 |
| app/emergency/sos.tsx | 9 |
| app/health/chronic-disease.tsx | 9 |
| app/nutrition/body-composition.tsx | 9 |
| app/payments/processing.tsx | 9 |
| app/settings/help.tsx | 9 |
| src/components/livekit-view.tsx | 9 |
| app/(auth)/welcome.tsx | 8 |
| app/drug-scanner/index.tsx | 8 |
| app/health/reminders.tsx | 8 |
| app/loyalty/leaderboard.tsx | 8 |
| app/nursing/nurse-profile.tsx | 8 |
| app/pharmacy/broadcast-status.tsx | 8 |
| app/reports/timeline.tsx | 8 |
| app/settings/data.tsx | 8 |
| app/support/chat.tsx | 8 |
| app/consultations/home-visit-tracking.tsx | 7 |
| app/delivery/address-select.tsx | 7 |
| app/diagnostics/packages.tsx | 7 |
| app/diagnostics/test-detail.tsx | 7 |
| app/emergency/tracking.tsx | 7 |
| app/family/emergency-contacts.tsx | 7 |
| app/health/medication-reminder-list.tsx | 7 |
| app/mental-health/self-assessment.tsx | 7 |
| app/pharmacy/order-confirm.tsx | 7 |
| app/pharmacy/waiting-for-pharmacy.tsx | 7 |
| app/wearables/hub.tsx | 7 |
| app/(auth)/reset-password.tsx | 6 |
| app/ai/triage.tsx | 6 |
| app/consultations/clinic/[id].tsx | 6 |
| app/diagnostics/insurance-upload.tsx | 6 |
| app/diagnostics/lab-comparison.tsx | 6 |
| app/insurance/refund-status.tsx | 6 |
| app/maternity/baby-growth.tsx | 6 |
| app/nursing/service-details.tsx | 6 |
| app/nutrition/water-tracker.tsx | 6 |
| app/pharmacy/order-history.tsx | 6 |
| app/pharmacy/payment.tsx | 6 |
| app/reviews/index.tsx | 6 |
| app/settings/feedback.tsx | 6 |
| app/wallet/hub.tsx | 6 |
| src/components/BottomNavBar.tsx | 6 |
| src/hooks/useGuestGuard.tsx | 6 |
| app/(auth)/forgot-password.tsx | 5 |
| app/ai-assistant.tsx | 5 |
| app/community/live-session.tsx | 5 |
| app/insurance/approval-pending.tsx | 5 |
| app/insurance/submit-claim.tsx | 5 |
| app/(tabs)/pharmacy.tsx | 4 |
| app/family/voice-call.tsx | 4 |
| app/health/chronic-medications.tsx | 4 |
| app/insurance/add-policy.tsx | 4 |
| app/pharmacy/scan-prescription.tsx | 4 |
| app/profile/insurance.tsx | 4 |
| src/context/DiagnosticsCartContext.tsx | 4 |
| app/(tabs)/nursing.tsx | 3 |
| app/consultations/chat-with-doctor.tsx | 3 |
| app/consultations/incoming-call.tsx | 3 |
| app/consultations/video-call.tsx | 3 |
| app/consultations/virtual-waiting-room.tsx | 3 |
| app/diagnostics/package-detail.tsx | 3 |
| app/family/chat.tsx | 3 |
| app/health/prescriptions.tsx | 3 |
| app/loyalty/challenges.tsx | 3 |
| app/mental-health/mood-journal.tsx | 3 |
| app/payments/failed.tsx | 3 |
| app/payments/failure.tsx | 3 |
| app/support/ticket.tsx | 3 |
| src/components/ui.tsx | 3 |
| src/design-system/components/Avatar.tsx | 3 |
| src/design-system/components/Badge.tsx | 3 |
| app/consultations/clinic-location.tsx | 2 |
| app/consultations/waiting-room.tsx | 2 |
| app/diagnostics/booking-success.tsx | 2 |
| app/diagnostics/lab/[id].tsx | 2 |
| app/diagnostics/results-history.tsx | 2 |
| app/health/wearables.tsx | 2 |
| app/insurance/claim-tracking.tsx | 2 |
| app/pharmacy/manual-order.tsx | 2 |
| app/pharmacy/pharmacist-chat.tsx | 2 |
| app/pharmacy/wishlist.tsx | 2 |
| src/__tests__/utils/testUtils.ts | 2 |
| src/components/Header.tsx | 2 |
| src/components/NotificationHandler.tsx | 2 |
| src/context/AppContext.tsx | 2 |
| src/design-system/components/BottomSheet.tsx | 2 |
| src/design-system/components/Input.tsx | 2 |
| src/design-system/components/Loading.tsx | 2 |
| app/(auth)/provider-info.tsx | 1 |
| app/(onboarding)/language.tsx | 1 |
| app/_layout.tsx | 1 |
| app/consultations/post-call-rating.tsx | 1 |
| app/diagnostics/cart.tsx | 1 |
| app/diagnostics/search.tsx | 1 |
| app/insurance/network-providers.tsx | 1 |
| app/profile/addresses.tsx | 1 |
| app/room/[id].tsx | 1 |
| app/settings/terms.tsx | 1 |
| src/config/seo.ts | 1 |
| src/constants/index.ts | 1 |
| src/context/ConsultationsContext.tsx | 1 |
| src/core/config/ConfigManager.ts | 1 |
| src/design-system/components/OTPInput.tsx | 1 |
| src/design-system/components/Toast.tsx | 1 |

## المرشحات التفصيلية

| الملف | السطر | النص المرشح |
|---|---:|---|
| app/(auth)/forgot-password.tsx | 44 | خطأ |
| app/(auth)/forgot-password.tsx | 44 | فشل إرسال رمز التحقق |
| app/(auth)/forgot-password.tsx | 106 | البريد الإلكتروني |
| app/(auth)/forgot-password.tsx | 112 | إرسال رمز التحقق |
| app/(auth)/forgot-password.tsx | 120 | العودة لتسجيل الدخول |
| app/(auth)/login.tsx | 105 | فشل تسجيل الدخول بواسطة ${provider} |
| app/(auth)/login.tsx | 124 | فشل تسجيل الدخول عبر آبل |
| app/(auth)/login.tsx | 133 | تم تجاوز المحاولات. حاول بعد ${remaining} دقائق |
| app/(auth)/login.tsx | 137 | أدخل بريد إلكتروني أو هاتف صحيح |
| app/(auth)/login.tsx | 141 | كلمة المرور 6 أحرف على الأقل |
| app/(auth)/login.tsx | 160 | تحقق من البيانات وحاول مجدداً |
| app/(auth)/login.tsx | 172 | هذا الحساب غير مصرح له باستخدام تطبيق المريض |
| app/(auth)/login.tsx | 176 | فشل تسجيل الدخول، حاول مجدداً |
| app/(auth)/login.tsx | 196 | مزود تسجيل الدخول غير مدعوم حالياً. |
| app/(auth)/login.tsx | 296 | جاري التحقق... |
| app/(auth)/login.tsx | 296 | تسجيل الدخول |
| app/(auth)/login.tsx | 305 | , isDark) } ]}>الدخول برمز التحقق (OTP)</Text> </TouchableOpacity> <View style={{ flexDirection: |
| app/(auth)/login.tsx | 310 | }}>أو الدخول بواسطة</Text> <View style={{ flex: 1, height: 1, backgroundColor: resolveColor( |
| app/(auth)/otp.tsx | 102 | مريض نبض |
| app/(auth)/otp.tsx | 116 | خطأ |
| app/(auth)/otp.tsx | 116 | رمز غير صحيح أو الحساب غير موجود |
| app/(auth)/otp.tsx | 135 | خطأ |
| app/(auth)/otp.tsx | 135 | رمز التحقق غير صحيح |
| app/(auth)/otp.tsx | 182 | إعادة الإرسال خلال |
| app/(auth)/otp.tsx | 182 | لم يصلك الرمز؟ |
| app/(auth)/otp.tsx | 201 | جاري التحقق... |
| app/(auth)/otp.tsx | 201 | تأكيد الرمز |
| app/(auth)/provider-info.tsx | 59 | الاستمرار كمريض |
| app/(auth)/register.tsx | 36 | هاتف |
| app/(auth)/register.tsx | 36 | بريد |
| app/(auth)/register.tsx | 126 | فشل التسجيل بواسطة ${provider} |
| app/(auth)/register.tsx | 145 | فشل التسجيل عبر آبل |
| app/(auth)/register.tsx | 152 | الاسم مطلوب (3 أحرف على الأقل) |
| app/(auth)/register.tsx | 153 | رقم هاتف صحيح مطلوب |
| app/(auth)/register.tsx | 154 | البريد الإلكتروني مطلوب وصحيح |
| app/(auth)/register.tsx | 155 | كلمة المرور 6 أحرف على الأقل |
| app/(auth)/register.tsx | 156 | كلمتا المرور غير متطابقتين |
| app/(auth)/register.tsx | 157 | يرجى الموافقة على الشروط والأحكام أولاً |
| app/(auth)/register.tsx | 183 | فشل إرسال رمز التحقق |
| app/(auth)/register.tsx | 198 | مزود تسجيل الدخول غير مدعوم حالياً. |
| app/(auth)/register.tsx | 217 | الاسم الكامل |
| app/(auth)/register.tsx | 219 | أحمد السالم |
| app/(auth)/register.tsx | 226 | رقم الهاتف |
| app/(auth)/register.tsx | 244 | كلمة المرور |
| app/(auth)/register.tsx | 254 | تأكيد كلمة المرور |
| app/(auth)/register.tsx | 286 | جاري الإرسال... |
| app/(auth)/register.tsx | 286 | إنشاء الحساب |
| app/(auth)/reset-password.tsx | 43 | خطأ |
| app/(auth)/reset-password.tsx | 43 | فشل حفظ كلمة المرور الجديدة |
| app/(auth)/reset-password.tsx | 73 | تسجيل الدخول |
| app/(auth)/reset-password.tsx | 115 | كلمة المرور الجديدة |
| app/(auth)/reset-password.tsx | 125 | تأكيد كلمة المرور |
| app/(auth)/reset-password.tsx | 128 | غير متطابقتين |
| app/(auth)/welcome.tsx | 47 | العربية |
| app/(auth)/welcome.tsx | 51 | اردو |
| app/(auth)/welcome.tsx | 133 | نبض بلس |
| app/(auth)/welcome.tsx | 137 | رعايتك الصحية المتكاملة في تطبيق واحد — استشارات، صيدلية، تحاليل، وأكثر |
| app/(auth)/welcome.tsx | 146 | الاستمرار بدون تسجيل |
| app/(auth)/welcome.tsx | 154 | تسجيل |
| app/(auth)/welcome.tsx | 162 | تسجيل دخول |
| app/(auth)/welcome.tsx | 169 | أو الدخول بواسطة |
| app/(onboarding)/index.tsx | 25 | رعايتك الصحية الشاملة |
| app/(onboarding)/index.tsx | 26 | احجز أفضل الأطباء في جميع التخصصات في ثوانٍ |
| app/(onboarding)/index.tsx | 33 | صيدليتك في جيبك |
| app/(onboarding)/index.tsx | 34 | اطلب الأدوية والمستلزمات الطبية مع توصيل سريع لبابك |
| app/(onboarding)/index.tsx | 41 | فحوصاتك من المنزل |
| app/(onboarding)/index.tsx | 42 | احجز التحاليل والأشعة مع زيارة منزلية وأسعار مقارنة |
| app/(onboarding)/index.tsx | 49 | تمريض متخصص في بيتك |
| app/(onboarding)/index.tsx | 50 | خدمات تمريضية احترافية على مدار الساعة في منزلك |
| app/(onboarding)/index.tsx | 57 | ذكاء اصطناعي يرافق صحتك |
| app/(onboarding)/index.tsx | 58 | مساعد ذكي يحلل أعراضك ويترجم وصفاتك ويتابع صحتك يومياً |
| app/(onboarding)/index.tsx | 208 | ابدأ رحلتك الصحية |
| app/(onboarding)/index.tsx | 208 | التالي |
| app/(onboarding)/language.tsx | 58 | متابعة |
| app/(onboarding)/permissions.tsx | 28 | الإشعارات |
| app/(onboarding)/permissions.tsx | 29 | تذكيرات الأدوية والمواعيد والعروض |
| app/(onboarding)/permissions.tsx | 34 | الكاميرا |
| app/(onboarding)/permissions.tsx | 35 | مسح الوصفات والباركود وتصوير الأدوية |
| app/(onboarding)/permissions.tsx | 40 | الموقع |
| app/(onboarding)/permissions.tsx | 41 | البحث عن أقرب صيدلية ومختبر وطبيب |
| app/(onboarding)/permissions.tsx | 46 | البيانات الصحية |
| app/(onboarding)/permissions.tsx | 47 | مزامنة المؤشرات الحيوية من الأجهزة |
| app/(onboarding)/permissions.tsx | 169 | متابعة |
| app/(tabs)/consultations/index.tsx | 26 | الكل |
| app/(tabs)/consultations/index.tsx | 28 | الكل |
| app/(tabs)/consultations/index.tsx | 174 | ابحث عن دكتور أو تخصص... |
| app/(tabs)/consultations/index.tsx | 204 | الكل |
| app/(tabs)/consultations/index.tsx | 204 | الكل |
| app/(tabs)/consultations/index.tsx | 205 | الكل |
| app/(tabs)/consultations/index.tsx | 207 | كاش |
| app/(tabs)/consultations/index.tsx | 207 | كاش |
| app/(tabs)/consultations/index.tsx | 208 | كاش |
| app/(tabs)/consultations/index.tsx | 210 | تأمين |
| app/(tabs)/consultations/index.tsx | 210 | تأمين |
| app/(tabs)/consultations/index.tsx | 211 | تأمين |
| app/(tabs)/consultations/index.tsx | 270 | عيادة |
| app/(tabs)/consultations/index.tsx | 271 | منزلي |
| app/(tabs)/consultations/index.tsx | 272 | أونلاين |
| app/(tabs)/consultations/index.tsx | 380 | عيادة |
| app/(tabs)/consultations/index.tsx | 381 | منزلي |
| app/(tabs)/consultations/index.tsx | 382 | أونلاين |
| app/(tabs)/consultations/index.tsx | 433 | الأعلى تقييماً |
| app/(tabs)/consultations/index.tsx | 433 | الكل |
| app/(tabs)/consultations/index.tsx | 433 | الكل |
| app/(tabs)/consultations/index.tsx | 433 | الكل |
| app/(tabs)/consultations/index.tsx | 433 | الكل |
| app/(tabs)/consultations/index.tsx | 445 | الأعلى تقييماً |
| app/(tabs)/consultations/index.tsx | 445 | الأقل سعراً |
| app/(tabs)/consultations/index.tsx | 445 | الأقرب |
| app/(tabs)/consultations/index.tsx | 454 | الكل |
| app/(tabs)/consultations/index.tsx | 454 | أخصائي |
| app/(tabs)/consultations/index.tsx | 454 | استشاري |
| app/(tabs)/consultations/index.tsx | 463 | الكل |
| app/(tabs)/consultations/index.tsx | 463 | طبيب |
| app/(tabs)/consultations/index.tsx | 463 | طبيبة |
| app/(tabs)/consultations/index.tsx | 472 | الكل |
| app/(tabs)/consultations/index.tsx | 472 | أقل من 100 |
| app/(tabs)/consultations/index.tsx | 472 | أكثر من 200 |
| app/(tabs)/consultations/index.tsx | 481 | الكل |
| app/(tabs)/consultations/index.tsx | 481 | اليوم |
| app/(tabs)/consultations/index.tsx | 481 | غداً |
| app/(tabs)/consultations/index.tsx | 508 | اختر شركة التأمين |
| app/(tabs)/consultations/index.tsx | 508 | اختر فئة التأمين |
| app/(tabs)/consultations/index.tsx | 520 | الكل |
| app/(tabs)/consultations/index.tsx | 520 | الكل |
| app/(tabs)/consultations/index.tsx | 549 | أهلاً بك في قسم الاستشارات! |
| app/(tabs)/consultations/index.tsx | 553 | الآن يمكنك تصفية الأطباء بسهولة. اختر "في العيادة" أو "أونلاين" أو "استشارة منزلية" ليتم عرض الأطباء المتاحين لتلك الخدمة فوراً. |
| app/(tabs)/consultations/index.tsx | 574 | ابدأ الآن |
| app/(tabs)/diagnostics.tsx | 91 | ابحث عن تحليل، باقة، أو مختبر... |
| app/(tabs)/diagnostics.tsx | 91 | ابحث عن نوع الأشعة أو المركز... |
| app/(tabs)/diagnostics.tsx | 133 | سحب عينة منزلي |
| app/(tabs)/diagnostics.tsx | 133 | أشعة منزلية |
| app/(tabs)/diagnostics.tsx | 141 | زيارة المختبر |
| app/(tabs)/diagnostics.tsx | 141 | زيارة المركز |
| app/(tabs)/diagnostics.tsx | 313 | نوفر لك أحدث أجهزة الأشعة المتنقلة مع طاقم فني متخصص لإجراء الفحوصات في راحة منزلك مع إصدار تقارير طبية معتمدة. |
| app/(tabs)/diagnostics.tsx | 314 | تتطلب بعض خدمات الأشعة والتصوير الطبي المعقدة زيارة للمركز. يمكنك حجز موعدك والدفع مسبقاً لتجنب الانتظار. |
| app/(tabs)/diagnostics.tsx | 335 | ٢٥٠ |
| app/(tabs)/diagnostics.tsx | 378 | الكل |
| app/(tabs)/diagnostics.tsx | 379 | التحاليل الطبية فقط |
| app/(tabs)/diagnostics.tsx | 380 | باقات وعروض التحاليل |
| app/(tabs)/diagnostics.tsx | 381 | المختبرات فقط |
| app/(tabs)/diagnostics.tsx | 382 | الأعلى تقييماً |
| app/(tabs)/diagnostics.tsx | 383 | الأقرب إليك |
| app/(tabs)/diagnostics.tsx | 384 | الأقل سعراً |
| app/(tabs)/diagnostics.tsx | 385 | سحب منزلي متاح |
| app/(tabs)/health.tsx | 36 | مؤشراتي |
| app/(tabs)/health.tsx | 42 | أدويتي |
| app/(tabs)/health.tsx | 48 | وصفاتي |
| app/(tabs)/health.tsx | 54 | تقاريري |
| app/(tabs)/health.tsx | 60 | العائلة |
| app/(tabs)/health.tsx | 66 | محادثة |
| app/(tabs)/health.tsx | 72 | تذكيرات |
| app/(tabs)/health.tsx | 78 | تحدياتي |
| app/(tabs)/health.tsx | 112 | الماء اليوم |
| app/(tabs)/health.tsx | 203 | مؤشراتك الحيوية |
| app/(tabs)/health.tsx | 204 | عرض الكل |
| app/(tabs)/health.tsx | 289 | مواعيدك القادمة |
| app/(tabs)/health.tsx | 290 | الكل |
| app/(tabs)/health.tsx | 320 | فيديو |
| app/(tabs)/index.tsx | 16 | استشارات |
| app/(tabs)/index.tsx | 17 | صيدلية |
| app/(tabs)/index.tsx | 18 | تحاليل |
| app/(tabs)/index.tsx | 19 | تمريض |
| app/(tabs)/index.tsx | 20 | التغذية |
| app/(tabs)/index.tsx | 21 | الأمومة |
| app/(tabs)/index.tsx | 22 | الخريطة |
| app/(tabs)/index.tsx | 23 | صحتي |
| app/(tabs)/index.tsx | 24 | إسعاف |
| app/(tabs)/index.tsx | 28 | المساعد الطبي الذكي |
| app/(tabs)/index.tsx | 29 | مترجم روشتات |
| app/(tabs)/index.tsx | 30 | تحليل البشرة |
| app/(tabs)/index.tsx | 31 | تقرير شهري |
| app/(tabs)/index.tsx | 58 | هذا المسار غير متاح في الإصدار الحالي. |
| app/(tabs)/index.tsx | 148 | مساء الخير |
| app/(tabs)/index.tsx | 149 | مستخدم نبض |
| app/(tabs)/index.tsx | 183 | ابحث عن طبيب، دواء، تحليل... |
| app/(tabs)/index.tsx | 189 | تذكير صحي |
| app/(tabs)/index.tsx | 217 | المساعد الذكي |
| app/(tabs)/index.tsx | 249 | كل الخدمات |
| app/(tabs)/index.tsx | 268 | ٢٦ |
| app/(tabs)/nursing.tsx | 103 | ابحث عن خدمة أو ممرض... |
| app/(tabs)/nursing.tsx | 141 | باقة شهرية |
| app/(tabs)/nursing.tsx | 141 | باقة أسبوعية |
| app/(tabs)/pharmacy.tsx | 217 | ابحث بالاسم أو المادة الفعالة... |
| app/(tabs)/pharmacy.tsx | 407 | مطلوب وصفة طبية |
| app/(tabs)/pharmacy.tsx | 408 | هذا الدواء يتطلب إرفاق روشتة طبية سارية. سيُطلب منك رفعها في سلة المشتريات لإتمام الطلب. |
| app/(tabs)/pharmacy.tsx | 409 | موافق |
| app/(tabs)/services.tsx | 23 | التحاليل المخبرية |
| app/(tabs)/services.tsx | 24 | حجز تحاليل في المنزل أو المختبر |
| app/(tabs)/services.tsx | 30 | التمريض المنزلي |
| app/(tabs)/services.tsx | 31 | ممرضون معتمدون يصلون إليك |
| app/(tabs)/services.tsx | 34 | جديد |
| app/(tabs)/services.tsx | 38 | الأشعة التشخيصية |
| app/(tabs)/services.tsx | 39 | حجز أشعة سينية، رنين، أشعة مقطعية |
| app/(tabs)/services.tsx | 45 | رعاية الأمومة |
| app/(tabs)/services.tsx | 46 | متابعة الحمل والولادة والنفاس |
| app/(tabs)/services.tsx | 55 | الطوارئ والإسعاف |
| app/(tabs)/services.tsx | 56 | طلب إسعاف أو استشارة طارئة |
| app/(tabs)/services.tsx | 62 | فحص النظر |
| app/(tabs)/services.tsx | 63 | حجز فحص عيون مع أخصائي |
| app/(tabs)/services.tsx | 69 | طب الأسنان |
| app/(tabs)/services.tsx | 70 | تنظيف، حشو، تقويم، زراعة |
| app/(tabs)/services.tsx | 76 | الصحة النفسية |
| app/(tabs)/services.tsx | 77 | استشارات نفسية وجلسات علاجية |
| app/(tabs)/services.tsx | 83 | التغذية والحمية |
| app/(tabs)/services.tsx | 84 | خطط غذائية وتتبع السعرات |
| app/(tabs)/services.tsx | 90 | الرعاية المنزلية |
| app/(tabs)/services.tsx | 91 | رعاية كبار السن والأمراض المزمنة |
| app/(tabs)/services.tsx | 117 | الخدمات الرئيسية |
| app/(tabs)/services.tsx | 161 | خدمات إضافية |
| app/_layout.tsx | 49 | زائر |
| app/ai-assistant.tsx | 25 | مرحباً بك في نبض بلس! أنا مساعدك الطبي الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن الأعراض، أو الأدوية، أو رفع صورة لوصفة طبية لقراءتها. |
| app/ai-assistant.tsx | 115 | المساعد الطبي AI |
| app/ai-assistant.tsx | 122 | تشخيص الأعراض |
| app/ai-assistant.tsx | 123 | قراءة روشتة |
| app/ai-assistant.tsx | 124 | معلومات دواء |
| app/ai/chat-doctor.tsx | 30 | مرحباً أحمد! أنا مساعدك الطبي الذكي نبض AI. كيف يمكنني مساعدتك اليوم؟\n\nيمكنني مساعدتك في:\n• وصف الأعراض والحصول على نصيحة أولية\n• شرح نتائج التحاليل\n• معلومات عن الأدوية\n• حجز موعد مع الطبيب المناسب |
| app/ai/chat-doctor.tsx | 31 | الآن |
| app/ai/chat-doctor.tsx | 32 | عندي صداع |
| app/ai/chat-doctor.tsx | 32 | اريد فهم تحاليلي |
| app/ai/chat-doctor.tsx | 32 | احجز لي موعد |
| app/ai/chat-doctor.tsx | 32 | معلومات عن دواء |
| app/ai/chat-doctor.tsx | 63 | الآن |
| app/ai/chat-doctor.tsx | 209 | صوت |
| app/ai/chat-doctor.tsx | 209 | التسجيل الصوتي غير متاح حالياً |
| app/ai/chat-doctor.tsx | 217 | اكتب سؤالك الطبي... |
| app/ai/monthly-report.tsx | 29 | ضغط الدم 🫀 |
| app/ai/monthly-report.tsx | 30 | تحسّن |
| app/ai/monthly-report.tsx | 33 | انخفض متوسط ضغطك من 135/88 إلى 128/82 خلال يونيو. تحسّن ملحوظ بنسبة 8%. |
| app/ai/monthly-report.tsx | 34 | استمر في الأدوية الحالية وتقليل الملح في الطعام |
| app/ai/monthly-report.tsx | 37 | سكر الدم |
| app/ai/monthly-report.tsx | 38 | مستقر |
| app/ai/monthly-report.tsx | 41 | HbA1c عند 6.8% — ضمن الهدف العلاجي. بعض الارتفاعات بعد الغداء. |
| app/ai/monthly-report.tsx | 42 | اقلّص الكارب في وجبة الغداء وامشِ 20 دقيقة بعدها |
| app/ai/monthly-report.tsx | 45 | النشاط البدني |
| app/ai/monthly-report.tsx | 46 | يحتاج تحسين |
| app/ai/monthly-report.tsx | 49 | متوسط 4,200 خطوة/يوم — أقل من الهدف 10,000. أسبوعان بدون رياضة. |
| app/ai/monthly-report.tsx | 50 | ابدأ بـ 15 دقيقة مشي يومي وزِدها تدريجياً |
| app/ai/monthly-report.tsx | 53 | النوم |
| app/ai/monthly-report.tsx | 54 | جيد |
| app/ai/monthly-report.tsx | 57 | متوسط 7.1 ساعة/ليلة. جودة النوم 74% — تحسّن عن الشهر السابق (68%). |
| app/ai/monthly-report.tsx | 58 | الاستمرار في روتين النوم الحالي يُعطي نتائج ممتازة |
| app/ai/monthly-report.tsx | 63 | استشارة قلب |
| app/ai/monthly-report.tsx | 63 | د. أحمد السيد |
| app/ai/monthly-report.tsx | 63 | 5 يونيو |
| app/ai/monthly-report.tsx | 63 | تعديل جرعة دواء الضغط |
| app/ai/monthly-report.tsx | 64 | تحليل HbA1c |
| app/ai/monthly-report.tsx | 64 | مختبر الدقة |
| app/ai/monthly-report.tsx | 64 | 15 يونيو |
| app/ai/monthly-report.tsx | 64 | 6.8% — طبيعي |
| app/ai/monthly-report.tsx | 65 | استشارة تغذية |
| app/ai/monthly-report.tsx | 65 | د. سارة الحربي |
| app/ai/monthly-report.tsx | 65 | 28 يونيو |
| app/ai/monthly-report.tsx | 65 | مراجعة الخطة الغذائية |
| app/ai/monthly-report.tsx | 73 | ضغط الدم 🫀 |
| app/ai/monthly-report.tsx | 102 | العلامات الحيوية |
| app/ai/monthly-report.tsx | 103 | الالتزام بالأدوية |
| app/ai/monthly-report.tsx | 104 | النشاط البدني |
| app/ai/monthly-report.tsx | 105 | جودة النوم |
| app/ai/monthly-report.tsx | 106 | التغذية |
| app/ai/monthly-report.tsx | 164 | مكتمل |
| app/ai/monthly-report.tsx | 164 | قادم |
| app/ai/prescription-translator.tsx | 19 | ميتفورمين 500 ملجم |
| app/ai/prescription-translator.tsx | 20 | قرص مرتين يومياً |
| app/ai/prescription-translator.tsx | 21 | بعد الأكل |
| app/ai/prescription-translator.tsx | 22 | 30 يوماً |
| app/ai/prescription-translator.tsx | 23 | لعلاج السكري النوع الثاني |
| app/ai/prescription-translator.tsx | 25 | غثيان |
| app/ai/prescription-translator.tsx | 25 | آلام معدة |
| app/ai/prescription-translator.tsx | 27 | جلوكوفاج |
| app/ai/prescription-translator.tsx | 27 | جلوكومين |
| app/ai/prescription-translator.tsx | 31 | أتورفاستاتين 20 ملجم |
| app/ai/prescription-translator.tsx | 32 | قرص مرة يومياً |
| app/ai/prescription-translator.tsx | 33 | عند النوم |
| app/ai/prescription-translator.tsx | 34 | 30 يوماً |
| app/ai/prescription-translator.tsx | 35 | لخفض الكوليسترول |
| app/ai/prescription-translator.tsx | 36 | تجنب مع عصير الجريب فروت |
| app/ai/prescription-translator.tsx | 37 | آلام عضلية نادرة |
| app/ai/prescription-translator.tsx | 39 | ليبيتور |
| app/ai/prescription-translator.tsx | 39 | توفاست |
| app/ai/prescription-translator.tsx | 44 | العربية |
| app/ai/prescription-translator.tsx | 71 | الإذن مطلوب |
| app/ai/prescription-translator.tsx | 71 | يرجى تفعيل صلاحية الوصول للكاميرا/المعرض للاستمرار. |
| app/ai/prescription-translator.tsx | 92 | خطأ |
| app/ai/prescription-translator.tsx | 92 | فشل قراءة ملف الصورة كـ Base64. |
| app/ai/prescription-translator.tsx | 97 | خطأ |
| app/ai/prescription-translator.tsx | 97 | حدث خطأ أثناء اختيار الصورة. |
| app/ai/prescription-translator.tsx | 103 | اختر مصدر الصورة |
| app/ai/prescription-translator.tsx | 104 | يرجى تحديد طريقة رفع صورة الوصفة الطبية: |
| app/ai/prescription-translator.tsx | 106 | التقاط صورة بالكاميرا |
| app/ai/prescription-translator.tsx | 107 | اختيار من المعرض ️ |
| app/ai/prescription-translator.tsx | 108 | إلغاء |
| app/ai/prescription-translator.tsx | 179 | ابدأ الترجمة |
| app/ai/prescription-translator.tsx | 193 | دقة القراءة: ${RESULT.ocrAccuracy}% |
| app/ai/prescription-translator.tsx | 194 | من: ${RESULT.langFrom} → إلى: ${RESULT.langTo} |
| app/ai/prescription-translator.tsx | 210 | الأدوية (${RESULT.medications.length}) |
| app/ai/prescription-translator.tsx | 242 | الاستخدام: ${med.notes} |
| app/ai/prescription-translator.tsx | 269 | اطلب — ${med.price} ر.س |
| app/ai/prescription-translator.tsx | 270 | تفاصيل |
| app/ai/prescription-translator.tsx | 289 | إضافة للتذكيرات |
| app/ai/prescription-translator.tsx | 290 | مشاركة مع الطبيب |
| app/ai/skin-analysis.tsx | 18 | جفاف الجلد المتوسط |
| app/ai/skin-analysis.tsx | 20 | خفيف-متوسط |
| app/ai/skin-analysis.tsx | 23 | الترطيب |
| app/ai/skin-analysis.tsx | 23 | منخفض |
| app/ai/skin-analysis.tsx | 24 | الإشراق |
| app/ai/skin-analysis.tsx | 24 | متوسط |
| app/ai/skin-analysis.tsx | 25 | نعومة البشرة |
| app/ai/skin-analysis.tsx | 25 | متوسط |
| app/ai/skin-analysis.tsx | 26 | التجانس |
| app/ai/skin-analysis.tsx | 26 | جيد |
| app/ai/skin-analysis.tsx | 29 | استخدم مرطباً يحتوي على حمض الهيالورونيك مرتين يومياً |
| app/ai/skin-analysis.tsx | 30 | اشرب 8 أكواب ماء على الأقل يومياً |
| app/ai/skin-analysis.tsx | 31 | تجنّب الاستحمام بالماء الساخن |
| app/ai/skin-analysis.tsx | 32 | استخدم واقي شمس SPF 50+ يومياً |
| app/ai/skin-analysis.tsx | 34 | مرطب نيفيا |
| app/ai/skin-analysis.tsx | 34 | سيروم فيتامين C |
| app/ai/skin-analysis.tsx | 34 | كريم SPF 50 |
| app/ai/skin-analysis.tsx | 35 | ينصح بزيارة طبيب جلدية إذا لم يتحسن الوضع خلال 2-3 أسابيع |
| app/ai/skin-analysis.tsx | 44 | الوجه |
| app/ai/skin-analysis.tsx | 47 | الوجه |
| app/ai/skin-analysis.tsx | 47 | اليدان |
| app/ai/skin-analysis.tsx | 47 | الظهر |
| app/ai/skin-analysis.tsx | 47 | الجسم |
| app/ai/skin-analysis.tsx | 56 | الإذن مطلوب |
| app/ai/skin-analysis.tsx | 56 | يرجى تفعيل صلاحية الوصول للكاميرا/المعرض للاستمرار. |
| app/ai/skin-analysis.tsx | 77 | خطأ |
| app/ai/skin-analysis.tsx | 77 | فشل قراءة ملف الصورة كـ Base64. |
| app/ai/skin-analysis.tsx | 82 | خطأ |
| app/ai/skin-analysis.tsx | 82 | حدث خطأ أثناء التقاط الصورة. |
| app/ai/skin-analysis.tsx | 101 | متوسط |
| app/ai/skin-analysis.tsx | 104 | الترطيب |
| app/ai/skin-analysis.tsx | 104 | متوسط |
| app/ai/skin-analysis.tsx | 105 | الإشراق |
| app/ai/skin-analysis.tsx | 105 | متوسط |
| app/ai/skin-analysis.tsx | 106 | نعومة البشرة |
| app/ai/skin-analysis.tsx | 106 | متوسط |
| app/ai/skin-analysis.tsx | 107 | التجانس |
| app/ai/skin-analysis.tsx | 107 | جيد |
| app/ai/skin-analysis.tsx | 109 | استخدم غسول لطيف للبشرة |
| app/ai/skin-analysis.tsx | 109 | تجنب الفرك الشديد |
| app/ai/skin-analysis.tsx | 111 | استشر طبيب الجلدية للمتابعة الدقيقة. |
| app/ai/skin-analysis.tsx | 119 | خطأ في التحليل |
| app/ai/skin-analysis.tsx | 119 | فشل تحليل صورة الجلد. يرجى المحاولة لاحقاً والتأكد من وضوح الصورة. |
| app/ai/skin-analysis.tsx | 126 | تحليل البشرة ️ |
| app/ai/skin-analysis.tsx | 127 | اختر مصدر صورة الجلد للتحليل: |
| app/ai/skin-analysis.tsx | 129 | التقاط صورة بالكاميرا |
| app/ai/skin-analysis.tsx | 130 | اختيار من المعرض ️ |
| app/ai/skin-analysis.tsx | 131 | إلغاء |
| app/ai/skin-analysis.tsx | 149 | تحليل لون البشرة |
| app/ai/skin-analysis.tsx | 149 | قياس مستوى الترطيب |
| app/ai/skin-analysis.tsx | 149 | فحص البنية الجلدية |
| app/ai/skin-analysis.tsx | 149 | مقارنة بقاعدة بيانات ضخمة |
| app/ai/symptom-checker.tsx | 37 | الرأس |
| app/ai/symptom-checker.tsx | 40 | صداع |
| app/ai/symptom-checker.tsx | 40 | دوار |
| app/ai/symptom-checker.tsx | 40 | ألم في الرأس |
| app/ai/symptom-checker.tsx | 44 | الحلق |
| app/ai/symptom-checker.tsx | 47 | التهاب حلق |
| app/ai/symptom-checker.tsx | 47 | بلع صعب |
| app/ai/symptom-checker.tsx | 51 | الصدر |
| app/ai/symptom-checker.tsx | 54 | ألم صدر |
| app/ai/symptom-checker.tsx | 54 | ضيق تنفس |
| app/ai/symptom-checker.tsx | 54 | سعال |
| app/ai/symptom-checker.tsx | 58 | البطن |
| app/ai/symptom-checker.tsx | 61 | ألم بطن |
| app/ai/symptom-checker.tsx | 61 | غثيان |
| app/ai/symptom-checker.tsx | 61 | إسهال |
| app/ai/symptom-checker.tsx | 65 | الذراع الأيسر |
| app/ai/symptom-checker.tsx | 68 | ألم ذراع |
| app/ai/symptom-checker.tsx | 68 | تنميل |
| app/ai/symptom-checker.tsx | 72 | الذراع الأيمن |
| app/ai/symptom-checker.tsx | 75 | ألم ذراع |
| app/ai/symptom-checker.tsx | 75 | تنميل |
| app/ai/symptom-checker.tsx | 79 | الحوض |
| app/ai/symptom-checker.tsx | 82 | ألم أسفل البطن |
| app/ai/symptom-checker.tsx | 82 | ألم في الظهر |
| app/ai/symptom-checker.tsx | 86 | الساق اليسرى |
| app/ai/symptom-checker.tsx | 89 | ألم ساق |
| app/ai/symptom-checker.tsx | 89 | تورم |
| app/ai/symptom-checker.tsx | 89 | تشنج |
| app/ai/symptom-checker.tsx | 93 | الساق اليمنى |
| app/ai/symptom-checker.tsx | 96 | ألم ساق |
| app/ai/symptom-checker.tsx | 96 | تورم |
| app/ai/symptom-checker.tsx | 96 | تشنج |
| app/ai/symptom-checker.tsx | 102 | صداع |
| app/ai/symptom-checker.tsx | 103 | حمى |
| app/ai/symptom-checker.tsx | 104 | سعال |
| app/ai/symptom-checker.tsx | 107 | ألم صدر |
| app/ai/symptom-checker.tsx | 111 | غثيان |
| app/ai/symptom-checker.tsx | 112 | دوار |
| app/ai/symptom-checker.tsx | 113 | إعياء |
| app/ai/symptom-checker.tsx | 114 | ضيق تنفس |
| app/ai/symptom-checker.tsx | 115 | ألم ظهر |
| app/ai/symptom-checker.tsx | 116 | التهاب حلق |
| app/ai/symptom-checker.tsx | 119 | ألم معدة |
| app/ai/symptom-checker.tsx | 123 | طفح جلدي |
| app/ai/symptom-checker.tsx | 127 | أقل من يوم |
| app/ai/symptom-checker.tsx | 128 | 1-3 أيام |
| app/ai/symptom-checker.tsx | 129 | 3-7 أيام |
| app/ai/symptom-checker.tsx | 130 | أكثر من أسبوع |
| app/ai/symptom-checker.tsx | 132 | خفيف |
| app/ai/symptom-checker.tsx | 132 | متوسط |
| app/ai/symptom-checker.tsx | 132 | شديد |
| app/ai/symptom-checker.tsx | 132 | شديد جداً |
| app/ai/symptom-checker.tsx | 161 | الأعراض: ${symptomLabels.join("، ")}. الشدة: ${severity \|\| "غير محددة"}. المدة: ${duration \|\| "غير محددة"}. |
| app/ai/symptom-checker.tsx | 180 | طب عام |
| app/ai/symptom-checker.tsx | 306 | غير محدد |
| app/ai/symptom-checker.tsx | 485 | الأمام 🫀 |
| app/ai/symptom-checker.tsx | 485 | الخلف |
| app/ai/symptom-checker.tsx | 712 | هل لديك حساسية لأدوية معينة؟ |
| app/ai/symptom-checker.tsx | 713 | هل تعاني من أمراض مزمنة؟ |
| app/ai/symptom-checker.tsx | 714 | هل تتناول أدوية حالياً؟ |
| app/ai/symptom-timeline.tsx | 19 | اليوم |
| app/ai/symptom-timeline.tsx | 20 | صداع |
| app/ai/symptom-timeline.tsx | 20 | حمى |
| app/ai/symptom-timeline.tsx | 21 | متوسط |
| app/ai/symptom-timeline.tsx | 25 | أمس |
| app/ai/symptom-timeline.tsx | 26 | تعب |
| app/ai/symptom-timeline.tsx | 26 | ألم حلق |
| app/ai/symptom-timeline.tsx | 27 | خفيف |
| app/ai/symptom-timeline.tsx | 30 | 3 أيام |
| app/ai/symptom-timeline.tsx | 30 | سعال |
| app/ai/symptom-timeline.tsx | 30 | خفيف |
| app/ai/triage.tsx | 23 | مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟ |
| app/ai/triage.tsx | 94 | مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟ |
| app/ai/triage.tsx | 174 | أشعر بألم شديد وثقل في صدري وضيق تنفس |
| app/ai/triage.tsx | 174 | أشعر بدوخة شديدة وعطش مستمر ومستوى السكر غير مستقر |
| app/ai/triage.tsx | 174 | صداع مستمر وحرارة مرتفعة منذ يومين |
| app/ai/triage.tsx | 198 | اكتب أعراضك هنا (مثال: أشعر بصداع كلي...) |
| app/community/hub.tsx | 60 | منشور جديد |
| app/community/hub.tsx | 61 | اكتب استفسارك أو تجربتك الصحية للمجتمع الطبي: |
| app/community/hub.tsx | 62 | إلغاء |
| app/community/hub.tsx | 62 | نشر |
| app/community/hub.tsx | 62 | تم النشر |
| app/community/hub.tsx | 62 | تم إرسال منشورك للمراجعة والظهور في المجتمع الصحي بنجاح. |
| app/community/hub.tsx | 81 | الخيارات |
| app/community/hub.tsx | 91 | مقالات طبية |
| app/community/hub.tsx | 91 | تجارب المرضى |
| app/community/hub.tsx | 91 | أسئلة وأجوبة |
| app/community/hub.tsx | 91 | قصص نجاح |
| app/community/hub.tsx | 111 | المنشورات الحالية |
| app/community/hub.tsx | 138 | عام |
| app/community/hub.tsx | 142 | الآن |
| app/community/live-session.tsx | 13 | أحمد م. |
| app/community/live-session.tsx | 13 | سؤال ممتاز يا دكتور! |
| app/community/live-session.tsx | 37 | أنت |
| app/community/live-session.tsx | 37 | الآن |
| app/community/live-session.tsx | 97 | أضف تعليقاً... |
| app/community/post-detail.tsx | 71 | تنبيه |
| app/community/post-detail.tsx | 71 | فشل عملية التصويت |
| app/community/post-detail.tsx | 140 | الآن |
| app/community/post-detail.tsx | 144 | عام |
| app/community/post-detail.tsx | 157 | نقاش |
| app/community/post-detail.tsx | 215 | الآن |
| app/community/post-detail.tsx | 218 | مجهول |
| app/community/post-detail.tsx | 218 | عضو |
| app/community/post-detail.tsx | 255 | أضف تعليقاً... |
| app/consultations/appointment-detail.tsx | 50 | غداً |
| app/consultations/appointment-detail.tsx | 51 | 10:00 ص |
| app/consultations/appointment-detail.tsx | 54 | التاريخ |
| app/consultations/appointment-detail.tsx | 55 | الوقت |
| app/consultations/appointment-detail.tsx | 56 | نوع الكشف |
| app/consultations/appointment-detail.tsx | 56 | زيارة منزلية |
| app/consultations/appointment-detail.tsx | 56 | كشف عيادة حضوري |
| app/consultations/appointment-detail.tsx | 56 | استشارة أونلاين (فيديو) |
| app/consultations/appointment-detail.tsx | 57 | المدة |
| app/consultations/appointment-detail.tsx | 57 | 30 دقيقة |
| app/consultations/appointment-detail.tsx | 58 | طريقة الدفع |
| app/consultations/appointment-detail.tsx | 58 | تغطية تأمين |
| app/consultations/appointment-detail.tsx | 58 | دفع نقدي |
| app/consultations/appointment-detail.tsx | 58 | بطاقة مدى/فيزا |
| app/consultations/appointment-detail.tsx | 59 | رقم الحجز |
| app/consultations/appointment-detail.tsx | 88 | د. أحمد محمد السيد |
| app/consultations/appointment-detail.tsx | 89 | جراح قلب وأوعية |
| app/consultations/appointment-detail.tsx | 127 | تأكد من اتصالك بالإنترنت قبل 5 دقائق |
| app/consultations/appointment-detail.tsx | 128 | اجلس في مكان هادئ ومضيء |
| app/consultations/appointment-detail.tsx | 129 | جهّز قائمة أسئلتك للطبيب |
| app/consultations/appointment-detail.tsx | 130 | أحضر نتائج التحاليل السابقة |
| app/consultations/appointment-detail.tsx | 146 | موافقة التأمين |
| app/consultations/appointment-detail.tsx | 148 | تمت الموافقة. ادفع نسبة التحمل (${appointment?.copay_amount \|\| 0} ريال) لفتح الاستشارة |
| app/consultations/appointment-detail.tsx | 152 | دفع ${appointment?.copay_amount \|\| 0} ريال |
| app/consultations/appointment-detail.tsx | 157 | إلغاء الموعد |
| app/consultations/appointments.tsx | 28 | مؤكد |
| app/consultations/appointments.tsx | 29 | مكتمل |
| app/consultations/appointments.tsx | 30 | ملغي |
| app/consultations/appointments.tsx | 31 | قيد المراجعة |
| app/consultations/appointments.tsx | 34 | أونلاين |
| app/consultations/appointments.tsx | 35 | عيادة |
| app/consultations/appointments.tsx | 36 | منزلي |
| app/consultations/appointments.tsx | 106 | القادمة |
| app/consultations/appointments.tsx | 106 | السابقة |
| app/consultations/appointments.tsx | 162 | قادمة |
| app/consultations/appointments.tsx | 162 | سابقة |
| app/consultations/appointments.tsx | 180 | نشط |
| app/consultations/appointments.tsx | 185 | استشارة |
| app/consultations/booking-confirm.tsx | 15 | فيديو |
| app/consultations/booking-confirm.tsx | 15 | استشارة عن بعد |
| app/consultations/booking-confirm.tsx | 16 | عيادة |
| app/consultations/booking-confirm.tsx | 16 | كشف حضوري |
| app/consultations/booking-confirm.tsx | 17 | منزلي |
| app/consultations/booking-confirm.tsx | 17 | زيارة منزلية |
| app/consultations/booking-confirm.tsx | 42 | طبيب استشاري |
| app/consultations/booking-confirm.tsx | 43 | أخصائي |
| app/consultations/booking-confirm.tsx | 44 | ممارس طبي |
| app/consultations/booking-confirm.tsx | 111 | تأكيد الحجز |
| app/consultations/booking-confirm.tsx | 135 | فشل إنشاء موعد الاستشارة |
| app/consultations/booking-confirm.tsx | 145 | فشل إنشاء عملية الدفع |
| app/consultations/booking-confirm.tsx | 174 | خطأ |
| app/consultations/booking-confirm.tsx | 174 | تعذر تأكيد الحجز. الرجاء المحاولة مرة أخرى. |
| app/consultations/booking-confirm.tsx | 202 | نوع الزيارة |
| app/consultations/booking-confirm.tsx | 216 | تفاصيل الموعد |
| app/consultations/booking-confirm.tsx | 218 | التاريخ |
| app/consultations/booking-confirm.tsx | 218 | اليوم |
| app/consultations/booking-confirm.tsx | 219 | الوقت |
| app/consultations/booking-confirm.tsx | 219 | غير محدد |
| app/consultations/booking-confirm.tsx | 220 | المدة |
| app/consultations/booking-confirm.tsx | 220 | 30 دقيقة |
| app/consultations/booking-confirm.tsx | 234 | طريقة الدفع |
| app/consultations/booking-confirm.tsx | 236 | بطاقة |
| app/consultations/booking-confirm.tsx | 237 | المحفظة |
| app/consultations/booking-confirm.tsx | 238 | تأمين |
| app/consultations/booking-confirm.tsx | 245 | بيانات التأمين |
| app/consultations/booking-confirm.tsx | 258 | تعديل بيانات التأمين |
| app/consultations/booking-confirm.tsx | 270 | && ( <View style={{ gap: 6 }}> <AppText variant="labelMD" color={colors.textPrimary}>اختر الفئة:</AppText> <View style={{ flexDirection: |
| app/consultations/booking-confirm.tsx | 296 | ملخص التكلفة |
| app/consultations/booking-confirm.tsx | 324 | * تم تطبيق التغطية بنجاح (تحمل المريض ${coverage.copay_percent}%${coverage.copay_flat > 0 ? |
| app/consultations/booking-confirm.tsx | 325 | * غير مغطى بالتأمين: ${coverage.reason \|\| 'المنشأة غير متعاقدة مع شبكتك'} |
| app/consultations/booking-confirm.tsx | 351 | التحقق من التأمين وتأكيد الحجز |
| app/consultations/booking-confirm.tsx | 351 | تأكيد الحجز ودفع ${total} ر.س |
| app/consultations/booking-success.tsx | 79 | تتبع حالة الموافقة |
| app/consultations/booking-success.tsx | 83 | عرض مواعيدي |
| app/consultations/booking-success.tsx | 87 | عرض موقع العيادة والاتجاهات |
| app/consultations/booking-success.tsx | 91 | تتبع الطبيب على الخريطة |
| app/consultations/booking-success.tsx | 94 | الدخول لغرفة الانتظار |
| app/consultations/booking-success.tsx | 109 | تم استلام الطلب |
| app/consultations/booking-success.tsx | 112 | تم الحجز بنجاح! |
| app/consultations/booking-success.tsx | 117 | في انتظار الموافقة الطبية لمعرفة نسبة التحمل (Copay) |
| app/consultations/booking-success.tsx | 120 | موعدك مؤكد مع الطبيب |
| app/consultations/booking-success.tsx | 208 | التاريخ والوقت |
| app/consultations/booking-success.tsx | 247 | الطبيب |
| app/consultations/call-history.tsx | 94 | 0 ثواني |
| app/consultations/call-history.tsx | 97 | ${s} ث |
| app/consultations/call-history.tsx | 98 | ${m} د و ${s} ث |
| app/consultations/call-history.tsx | 114 | مكالمة مكتملة |
| app/consultations/call-history.tsx | 116 | مرفوضة من الطرف الآخر |
| app/consultations/call-history.tsx | 116 | تم رفضها |
| app/consultations/call-history.tsx | 118 | لم يتم الرد |
| app/consultations/call-history.tsx | 118 | مكالمة فائتة |
| app/consultations/call-history.tsx | 120 | مكالمة نشطة حالياً |
| app/consultations/call-history.tsx | 122 | مكالمة معلقة |
| app/consultations/call-history.tsx | 142 | اتصال صادر |
| app/consultations/call-history.tsx | 142 | اتصال وارد |
| app/consultations/cancel-reschedule.tsx | 11 | ارتباط طارئ |
| app/consultations/cancel-reschedule.tsx | 12 | تحسّنت صحتي |
| app/consultations/cancel-reschedule.tsx | 13 | أريد تغيير الطبيب |
| app/consultations/cancel-reschedule.tsx | 14 | الوقت لا يناسبني |
| app/consultations/cancel-reschedule.tsx | 15 | مشكلة في الدفع |
| app/consultations/cancel-reschedule.tsx | 16 | سبب آخر |
| app/consultations/cancel-reschedule.tsx | 18 | الأحد 16 |
| app/consultations/cancel-reschedule.tsx | 18 | الاثنين 17 |
| app/consultations/cancel-reschedule.tsx | 18 | الثلاثاء 18 |
| app/consultations/cancel-reschedule.tsx | 18 | الأربعاء 19 |
| app/consultations/cancel-reschedule.tsx | 18 | الخميس 20 |
| app/consultations/cancel-reschedule.tsx | 19 | 9:00 ص |
| app/consultations/cancel-reschedule.tsx | 19 | 9:30 ص |
| app/consultations/cancel-reschedule.tsx | 19 | 10:00 ص |
| app/consultations/cancel-reschedule.tsx | 19 | 11:00 ص |
| app/consultations/cancel-reschedule.tsx | 19 | 2:00 م |
| app/consultations/cancel-reschedule.tsx | 19 | 3:00 م |
| app/consultations/cancel-reschedule.tsx | 19 | 4:00 م |
| app/consultations/cancel-reschedule.tsx | 58 | قبل 24 ساعة |
| app/consultations/cancel-reschedule.tsx | 58 | استرداد 100% |
| app/consultations/cancel-reschedule.tsx | 59 | قبل 12-24 ساعة |
| app/consultations/cancel-reschedule.tsx | 59 | استرداد 50% |
| app/consultations/cancel-reschedule.tsx | 60 | أقل من 12 ساعة |
| app/consultations/cancel-reschedule.tsx | 60 | لا يوجد استرداد |
| app/consultations/cancel-reschedule.tsx | 111 | جاري الإلغاء... |
| app/consultations/cancel-reschedule.tsx | 111 | تأكيد الإلغاء |
| app/consultations/cancel-reschedule.tsx | 153 | جاري التأجيل... |
| app/consultations/cancel-reschedule.tsx | 153 | تأكيد الموعد الجديد |
| app/consultations/chat-with-doctor.tsx | 57 | الآن |
| app/consultations/chat-with-doctor.tsx | 74 | الآن |
| app/consultations/chat-with-doctor.tsx | 143 | اكتب رسالة... |
| app/consultations/clinic-location.tsx | 35 | العيادة |
| app/consultations/clinic-location.tsx | 84 | عيادة الطبيب |
| app/consultations/clinic/[id].tsx | 65 | مستشفى وعيادات |
| app/consultations/clinic/[id].tsx | 73 | مستشفى وعيادات نبض بلس |
| app/consultations/clinic/[id].tsx | 77 | الرياض، المملكة العربية السعودية |
| app/consultations/clinic/[id].tsx | 80 | نبذة عن المستشفى |
| app/consultations/clinic/[id].tsx | 82 | مستشفى نبض بلس هو منشأة طبية حديثة تقدم أعلى مستويات الرعاية الصحية باستخدام أحدث التقنيات وأفضل الكوادر الطبية في جميع التخصصات. |
| app/consultations/clinic/[id].tsx | 87 | أطباء المستشفى |
| app/consultations/doctor-profile.tsx | 46 | طبيب |
| app/consultations/doctor-profile.tsx | 53 | ${res.average_wait} دقائق |
| app/consultations/doctor-profile.tsx | 53 | 15 دقيقة |
| app/consultations/doctor-profile.tsx | 84 | الانضمام لقائمة الانتظار الذكية |
| app/consultations/doctor-profile.tsx | 85 | هذا اليوم (${dateStr}) ممتلئ تماماً بالكامل.\n\nهل ترغب في الانضمام إلى قائمة الانتظار لتلقي إشعار تلقائي فوري وحجز الموعد إذا قام أي مريض بإلغاء حجزه؟\n\n(ترتيبك في القائمة: الثاني #2) |
| app/consultations/doctor-profile.tsx | 87 | إلغاء |
| app/consultations/doctor-profile.tsx | 89 | نعم، انضم للقائمة |
| app/consultations/doctor-profile.tsx | 97 | تم الانضمام بنجاح! |
| app/consultations/doctor-profile.tsx | 97 | لقد تمت إضافتك لقائمة الانتظار بنجاح. سنرسل لك إشعاراً فور توفر الموعد. |
| app/consultations/doctor-profile.tsx | 133 | نبذة |
| app/consultations/doctor-profile.tsx | 134 | الخدمات |
| app/consultations/doctor-profile.tsx | 135 | التقييمات |
| app/consultations/doctor-profile.tsx | 215 | مريض |
| app/consultations/doctor-profile.tsx | 216 | سنوات خبرة |
| app/consultations/doctor-profile.tsx | 217 | متوسط الانتظار |
| app/consultations/doctor-profile.tsx | 282 | هذا الطبيب غير متعاقد مع شبكة تأمينك |
| app/consultations/doctor-profile.tsx | 292 | + ${coverage.copay_flat} ريال |
| app/consultations/doctor-profile.tsx | 304 | دخول |
| app/consultations/doctor-profile.tsx | 304 | إضافة |
| app/consultations/doctor-profile.tsx | 316 | صور العيادة |
| app/consultations/doctor-profile.tsx | 316 | عرض الكل |
| app/consultations/doctor-profile.tsx | 329 | الخدمات |
| app/consultations/doctor-profile.tsx | 344 | احجز موعدك |
| app/consultations/doctor-profile.tsx | 344 | اختر اليوم |
| app/consultations/doctor-profile.tsx | 380 | صباحاً |
| app/consultations/doctor-profile.tsx | 380 | مساءً |
| app/consultations/doctor-profile.tsx | 380 | ليلاً |
| app/consultations/doctor-profile.tsx | 538 | الأسئلة الشائعة |
| app/consultations/doctor-profile.tsx | 550 | أطباء مشابهون |
| app/consultations/doctor-profile.tsx | 550 | عرض الكل |
| app/consultations/doctor-profile.tsx | 581 | تأكيد الحجز |
| app/consultations/doctor-search.tsx | 50 | استشاري |
| app/consultations/doctor-search.tsx | 55 | ${d.average_wait} دق |
| app/consultations/doctor-search.tsx | 55 | 10 دق |
| app/consultations/doctor-search.tsx | 61 | عيادة خاصة |
| app/consultations/doctor-search.tsx | 62 | اليوم |
| app/consultations/doctor-search.tsx | 111 | ابحث بالاسم أو التخصص... |
| app/consultations/doctor-search.tsx | 125 | الأعلى تقييماً |
| app/consultations/doctor-search.tsx | 126 | الأقل سعراً |
| app/consultations/doctor-search.tsx | 127 | الأقل انتظاراً |
| app/consultations/doctor/[id].tsx | 14 | صباحي |
| app/consultations/doctor/[id].tsx | 14 | ظهيرة |
| app/consultations/doctor/[id].tsx | 14 | مسائي |
| app/consultations/doctor/[id].tsx | 14 | ليلي |
| app/consultations/doctor/[id].tsx | 18 | ٧:٠٠ ص |
| app/consultations/doctor/[id].tsx | 18 | ٨:٠٠ ص |
| app/consultations/doctor/[id].tsx | 18 | ٩:٠٠ ص |
| app/consultations/doctor/[id].tsx | 18 | ١٠:٠٠ ص |
| app/consultations/doctor/[id].tsx | 18 | ١١:٠٠ ص |
| app/consultations/doctor/[id].tsx | 19 | ١٢:٠٠ م |
| app/consultations/doctor/[id].tsx | 19 | ١:٠٠ م |
| app/consultations/doctor/[id].tsx | 19 | ٢:٠٠ م |
| app/consultations/doctor/[id].tsx | 20 | ٤:٠٠ م |
| app/consultations/doctor/[id].tsx | 20 | ٥:٠٠ م |
| app/consultations/doctor/[id].tsx | 20 | ٦:٠٠ م |
| app/consultations/doctor/[id].tsx | 21 | ٨:٠٠ م |
| app/consultations/doctor/[id].tsx | 21 | ٩:٠٠ م |
| app/consultations/doctor/[id].tsx | 83 | أحد |
| app/consultations/doctor/[id].tsx | 83 | إثنين |
| app/consultations/doctor/[id].tsx | 83 | ثلاثاء |
| app/consultations/doctor/[id].tsx | 83 | أربعاء |
| app/consultations/doctor/[id].tsx | 83 | خميس |
| app/consultations/doctor/[id].tsx | 83 | جمعة |
| app/consultations/doctor/[id].tsx | 83 | سبت |
| app/consultations/doctor/[id].tsx | 85 | يناير |
| app/consultations/doctor/[id].tsx | 85 | فبراير |
| app/consultations/doctor/[id].tsx | 85 | مارس |
| app/consultations/doctor/[id].tsx | 85 | أبريل |
| app/consultations/doctor/[id].tsx | 85 | مايو |
| app/consultations/doctor/[id].tsx | 85 | يونيو |
| app/consultations/doctor/[id].tsx | 85 | يوليو |
| app/consultations/doctor/[id].tsx | 85 | أغسطس |
| app/consultations/doctor/[id].tsx | 85 | سبتمبر |
| app/consultations/doctor/[id].tsx | 85 | أكتوبر |
| app/consultations/doctor/[id].tsx | 85 | نوفمبر |
| app/consultations/doctor/[id].tsx | 85 | ديسمبر |
| app/consultations/doctor/[id].tsx | 91 | ٠١٢٣٤٥٦٧٨٩ |
| app/consultations/doctor/[id].tsx | 122 | احجز موعد مع ${doc?.n} عبر نبض بلس! الرابط: ${url} |
| app/consultations/doctor/[id].tsx | 146 | هل الكشف يشمل المتابعة؟ |
| app/consultations/doctor/[id].tsx | 146 | نعم، الكشف يشمل متابعة مجانية خلال ١٥ يوم من تاريخ الزيارة الأولى. |
| app/consultations/doctor/[id].tsx | 147 | هل يمكن إلغاء الموعد؟ |
| app/consultations/doctor/[id].tsx | 147 | يمكنك الإلغاء أو التعديل قبل الموعد بـ ٤ ساعات على الأقل بدون رسوم. |
| app/consultations/doctor/[id].tsx | 174 | الطبيب غير موجود |
| app/consultations/doctor/[id].tsx | 213 | مستشفى وعيادات نبض بلس |
| app/consultations/doctor/[id].tsx | 226 | ر.س |
| app/consultations/doctor/[id].tsx | 277 | عيادة |
| app/consultations/doctor/[id].tsx | 278 | أونلاين |
| app/consultations/doctor/[id].tsx | 279 | منزلي |
| app/consultations/doctor/[id].tsx | 342 | استشاري باطنة وجهاز هضمي. خبرة +١٥ عامًا. الزمالة البريطانية MRCP. |
| app/consultations/doctor/[id].tsx | 345 | مناظير |
| app/consultations/doctor/[id].tsx | 345 | قولون |
| app/consultations/doctor/[id].tsx | 345 | كبد |
| app/consultations/doctor/[id].tsx | 356 | ١٥+ |
| app/consultations/doctor/[id].tsx | 360 | ٢,٥٠٠+ |
| app/consultations/doctor/[id].tsx | 373 | صور العيادة وغرفة الكشف |
| app/consultations/doctor/[id].tsx | 389 | المستشفى والمرافق |
| app/consultations/doctor/[id].tsx | 407 | المؤهلات |
| app/consultations/doctor/[id].tsx | 407 | دكتوراه الباطنة — جامعة القاهرة |
| app/consultations/doctor/[id].tsx | 408 | اللغات |
| app/consultations/doctor/[id].tsx | 408 | العربية، الإنجليزية |
| app/consultations/doctor/[id].tsx | 409 | طرق الدفع |
| app/consultations/doctor/[id].tsx | 409 | كاش، فيزا، تأمين طبي |
| app/consultations/follow-up.tsx | 42 | الآن |
| app/consultations/follow-up.tsx | 73 | متابعة نشطة |
| app/consultations/follow-up.tsx | 79 | التشخيص |
| app/consultations/follow-up.tsx | 85 | الأدوية الموصوفة |
| app/consultations/follow-up.tsx | 92 | عرض الوصفة الكاملة |
| app/consultations/follow-up.tsx | 102 | تأكيد |
| app/consultations/follow-up.tsx | 108 | تحديثات الحالة |
| app/consultations/follow-up.tsx | 120 | الطبيب |
| app/consultations/follow-up.tsx | 120 | أنت |
| app/consultations/follow-up.tsx | 131 | كيف حالتك اليوم؟ أي تحسن أو أعراض جديدة؟ |
| app/consultations/follow-up.tsx | 132 | إرسال تحديث |
| app/consultations/follow-up.tsx | 137 | محادثة الطبيب |
| app/consultations/follow-up.tsx | 138 | حجز موعد متابعة |
| app/consultations/home-visit-tracking.tsx | 74 | ١٢ |
| app/consultations/home-visit-tracking.tsx | 81 | تم تأكيد الطلب |
| app/consultations/home-visit-tracking.tsx | 82 | الطبيب في الطريق |
| app/consultations/home-visit-tracking.tsx | 82 | الطبيب في الطريق |
| app/consultations/home-visit-tracking.tsx | 82 | وصل لموقعك |
| app/consultations/home-visit-tracking.tsx | 83 | وصل لموقعك |
| app/consultations/home-visit-tracking.tsx | 83 | وصل لموقعك |
| app/consultations/incoming-call.tsx | 23 | د. محمد أحمد الكردي |
| app/consultations/incoming-call.tsx | 86 | مكالمة فيديو واردة... |
| app/consultations/incoming-call.tsx | 87 | مكالمة صوتية واردة... |
| app/consultations/offer/[id].tsx | 27 | عيادات المسواك لطب الأسنان |
| app/consultations/offer/[id].tsx | 27 | مجمع عيادات |
| app/consultations/offer/[id].tsx | 27 | 1.2 كم |
| app/consultations/offer/[id].tsx | 28 | مستشفى دله |
| app/consultations/offer/[id].tsx | 28 | مستشفى عام |
| app/consultations/offer/[id].tsx | 56 | أحد |
| app/consultations/offer/[id].tsx | 56 | إثنين |
| app/consultations/offer/[id].tsx | 56 | ثلاثاء |
| app/consultations/offer/[id].tsx | 56 | أربعاء |
| app/consultations/offer/[id].tsx | 56 | خميس |
| app/consultations/offer/[id].tsx | 56 | جمعة |
| app/consultations/offer/[id].tsx | 56 | سبت |
| app/consultations/offer/[id].tsx | 58 | يناير |
| app/consultations/offer/[id].tsx | 58 | فبراير |
| app/consultations/offer/[id].tsx | 58 | مارس |
| app/consultations/offer/[id].tsx | 58 | أبريل |
| app/consultations/offer/[id].tsx | 58 | مايو |
| app/consultations/offer/[id].tsx | 58 | يونيو |
| app/consultations/offer/[id].tsx | 58 | يوليو |
| app/consultations/offer/[id].tsx | 58 | أغسطس |
| app/consultations/offer/[id].tsx | 58 | سبتمبر |
| app/consultations/offer/[id].tsx | 58 | أكتوبر |
| app/consultations/offer/[id].tsx | 58 | نوفمبر |
| app/consultations/offer/[id].tsx | 58 | ديسمبر |
| app/consultations/offer/[id].tsx | 63 | ٠١٢٣٤٥٦٧٨٩ |
| app/consultations/offer/[id].tsx | 82 | صباحي |
| app/consultations/offer/[id].tsx | 82 | ظهيرة |
| app/consultations/offer/[id].tsx | 82 | مسائي |
| app/consultations/offer/[id].tsx | 82 | ليلي |
| app/consultations/offer/[id].tsx | 83 | ٧:٠٠ ص |
| app/consultations/offer/[id].tsx | 83 | ٨:٠٠ ص |
| app/consultations/offer/[id].tsx | 83 | ٩:٠٠ ص |
| app/consultations/offer/[id].tsx | 83 | ١٢:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ١:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ٢:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ٤:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ٥:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ٩:٠٠ م |
| app/consultations/offer/[id].tsx | 83 | ١٠:٠٠ م |
| app/consultations/post-call-rating.tsx | 92 | اكتب رأيك في الخدمة... |
| app/consultations/prescription-from-doctor.tsx | 122 | وصفة رسمية |
| app/consultations/prescription-from-doctor.tsx | 130 | التشخيص |
| app/consultations/prescription-from-doctor.tsx | 145 | الأدوية (${prescription.medications?.length \|\| 0}) |
| app/consultations/prescription-from-doctor.tsx | 185 | التكرار |
| app/consultations/prescription-from-doctor.tsx | 186 | المدة |
| app/consultations/prescription-from-doctor.tsx | 187 | التعليمات |
| app/consultations/prescription-from-doctor.tsx | 190 | الجرعة |
| app/consultations/prescription-from-doctor.tsx | 191 | ${med.pills} حبة |
| app/consultations/prescription-from-doctor.tsx | 214 | تمت الإضافة |
| app/consultations/prescription-from-doctor.tsx | 214 | إضافة للتذكير |
| app/consultations/prescription-from-doctor.tsx | 224 | التفاصيل |
| app/consultations/prescription-from-doctor.tsx | 245 | التحاليل المطلوبة (${prescription.labs.length}) |
| app/consultations/prescription-from-doctor.tsx | 254 | صائم 8 ساعات |
| app/consultations/prescription-from-doctor.tsx | 322 | طلب من الصيدلية |
| app/consultations/prescription-from-doctor.tsx | 332 | احجز موعد مختبر |
| app/consultations/prescription-from-doctor.tsx | 341 | تحميل PDF |
| app/consultations/share-report.tsx | 24 | تحاليل دم شاملة |
| app/consultations/share-report.tsx | 24 | 15 يونيو 2026 |
| app/consultations/share-report.tsx | 27 | أشعة سينية — صدر |
| app/consultations/share-report.tsx | 28 | 10 يونيو 2026 |
| app/consultations/share-report.tsx | 31 | وظائف الغدة الدرقية |
| app/consultations/share-report.tsx | 31 | 1 يونيو 2026 |
| app/consultations/share-report.tsx | 32 | تحليل بول كامل |
| app/consultations/share-report.tsx | 32 | 25 مايو 2026 |
| app/consultations/share-report.tsx | 33 | سكر تراكمي HbA1c |
| app/consultations/share-report.tsx | 33 | 20 مايو 2026 |
| app/consultations/share-report.tsx | 95 | اختر التقارير للمشاركة |
| app/consultations/share-report.tsx | 152 | رفع تقرير جديد |
| app/consultations/share-report.tsx | 171 | مشاركة ${selected.length} تقرير مع الطبيب |
| app/consultations/specialty-select.tsx | 24 | الطب العام والأسرة |
| app/consultations/specialty-select.tsx | 25 | العلاج الطبيعي والتأهيل |
| app/consultations/specialty-select.tsx | 26 | طب وجراحة الأسنان |
| app/consultations/specialty-select.tsx | 27 | الأمراض الجلدية والتجميل |
| app/consultations/specialty-select.tsx | 28 | طب وجراحة العيون |
| app/consultations/specialty-select.tsx | 29 | طب الأطفال وحديثي الولادة |
| app/consultations/specialty-select.tsx | 30 | أمراض القلب والأوعية الدموية |
| app/consultations/specialty-select.tsx | 31 | النساء والولادة |
| app/consultations/specialty-select.tsx | 32 | جراحة العظام والمفاصل |
| app/consultations/specialty-select.tsx | 33 | الطب النفسي والاستشارات |
| app/consultations/specialty-select.tsx | 68 | ابحث عن تخصص... |
| app/consultations/video-call.tsx | 56 | الطبيب المباشر |
| app/consultations/video-call.tsx | 155 | في انتظار انضمام الطبيب... |
| app/consultations/video-call.tsx | 155 | غير متصل |
| app/consultations/virtual-waiting-room.tsx | 71 | الموعد غير موجود |
| app/consultations/virtual-waiting-room.tsx | 174 | ٠${data.wait_time}:٠٠ |
| app/consultations/virtual-waiting-room.tsx | 174 | ٠٢:٣٠ |
| app/consultations/waiting-room.tsx | 69 | الموعد غير موجود |
| app/consultations/waiting-room.tsx | 185 | عيادة الباطنة |
| app/delivery/address-select.tsx | 43 | المنزل |
| app/delivery/address-select.tsx | 43 | شارع الأمير سلطان، حي السلامة |
| app/delivery/address-select.tsx | 43 | جدة |
| app/delivery/address-select.tsx | 81 | العناوين المحفوظة |
| app/delivery/address-select.tsx | 108 | العمل |
| app/delivery/address-select.tsx | 123 | ، ${addr.city} |
| app/delivery/address-select.tsx | 145 | تأكيد العنوان |
| app/diagnostics/book-sample.tsx | 29 | مكان سحب العينة |
| app/diagnostics/book-sample.tsx | 31 | في البيت |
| app/diagnostics/book-sample.tsx | 32 | في المختبر |
| app/diagnostics/book-sample.tsx | 80 | اختر التاريخ |
| app/diagnostics/book-sample.tsx | 82 | اليوم |
| app/diagnostics/book-sample.tsx | 82 | غداً |
| app/diagnostics/book-sample.tsx | 82 | بعد غد |
| app/diagnostics/book-sample.tsx | 89 | اختر الوقت |
| app/diagnostics/book-sample.tsx | 99 | التحاليل المطلوبة |
| app/diagnostics/book-sample.tsx | 112 | تعليمات قبل السحب |
| app/diagnostics/book-sample.tsx | 121 | تأكيد الحجز — ${location === 'home' ? selectedTime : selectedTime} |
| app/diagnostics/booking-confirm.tsx | 50 | تنبيه |
| app/diagnostics/booking-confirm.tsx | 50 | السلة فارغة حالياً |
| app/diagnostics/booking-confirm.tsx | 68 | شارع الأمير سلطان، حي السلامة، جدة |
| app/diagnostics/booking-confirm.tsx | 79 | فشل إنشاء الحجز |
| app/diagnostics/booking-confirm.tsx | 98 | نجاح |
| app/diagnostics/booking-confirm.tsx | 98 | تم حجز التحليل بنجاح! |
| app/diagnostics/booking-confirm.tsx | 99 | موافق |
| app/diagnostics/booking-confirm.tsx | 104 | خطأ |
| app/diagnostics/booking-confirm.tsx | 104 | فشل إتمام الحجز. يرجى التأكد من كافة الحقول. |
| app/diagnostics/booking-confirm.tsx | 126 | التحاليل المطلوبة |
| app/diagnostics/booking-confirm.tsx | 140 | مكان سحب العينة |
| app/diagnostics/booking-confirm.tsx | 142 | في المنزل |
| app/diagnostics/booking-confirm.tsx | 143 | في المختبر |
| app/diagnostics/booking-confirm.tsx | 196 | طريقة الدفع |
| app/diagnostics/booking-confirm.tsx | 198 | بطاقة |
| app/diagnostics/booking-confirm.tsx | 199 | المحفظة |
| app/diagnostics/booking-confirm.tsx | 200 | تأمين |
| app/diagnostics/booking-confirm.tsx | 206 | تفاصيل التأمين |
| app/diagnostics/booking-confirm.tsx | 219 | رقم بوليصة التأمين |
| app/diagnostics/booking-confirm.tsx | 220 | رقم عضوية التأمين |
| app/diagnostics/booking-confirm.tsx | 226 | ملخص التكلفة |
| app/diagnostics/booking-confirm.tsx | 254 | التحقق من التأمين والحجز |
| app/diagnostics/booking-confirm.tsx | 254 | تأكيد ودفع ${total} ر.س |
| app/diagnostics/booking-success.tsx | 61 | سيقوم أخصائي التحاليل بزيارتك في الوقت المحدد. يمكنك تتبع مسار المختص من خلال التطبيق. |
| app/diagnostics/booking-success.tsx | 62 | الرجاء الحضور للمركز قبل الموعد بـ ١٥ دقيقة وإبراز كود الحجز لموظف الاستقبال. |
| app/diagnostics/cart.tsx | 156 | غير محدد |
| app/diagnostics/checkout.tsx | 19 | الأحد |
| app/diagnostics/checkout.tsx | 19 | الاثنين |
| app/diagnostics/checkout.tsx | 19 | الثلاثاء |
| app/diagnostics/checkout.tsx | 19 | الأربعاء |
| app/diagnostics/checkout.tsx | 19 | الخميس |
| app/diagnostics/checkout.tsx | 19 | الجمعة |
| app/diagnostics/checkout.tsx | 19 | السبت |
| app/diagnostics/checkout.tsx | 26 | اليوم |
| app/diagnostics/checkout.tsx | 26 | غداً |
| app/diagnostics/checkout.tsx | 36 | ٠٨:٠٠ ص |
| app/diagnostics/checkout.tsx | 36 | ٠٨:٣٠ ص |
| app/diagnostics/checkout.tsx | 36 | ٠٩:٠٠ ص |
| app/diagnostics/checkout.tsx | 36 | ٠٩:٣٠ ص |
| app/diagnostics/checkout.tsx | 36 | ١٠:٠٠ ص |
| app/diagnostics/checkout.tsx | 36 | ١٠:٣٠ ص |
| app/diagnostics/checkout.tsx | 37 | ٠٤:٠٠ م |
| app/diagnostics/checkout.tsx | 37 | ٠٤:٣٠ م |
| app/diagnostics/checkout.tsx | 37 | ٠٥:٠٠ م |
| app/diagnostics/checkout.tsx | 37 | ٠٥:٣٠ م |
| app/diagnostics/checkout.tsx | 37 | ٠٦:٠٠ م |
| app/diagnostics/checkout.tsx | 37 | ٠٦:٣٠ م |
| app/diagnostics/checkout.tsx | 45 | مختبرات البرج |
| app/diagnostics/checkout.tsx | 47 | ٢٩٩ |
| app/diagnostics/checkout.tsx | 92 | سحب العينة من المنزل بواسطة مختص |
| app/diagnostics/checkout.tsx | 92 | الزيارة في المركز |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٠/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/١/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٢/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٣/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٤/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٥/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٦/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٧/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٨/g, |
| app/diagnostics/checkout.tsx | 251 | ).replace(/٩/g, |
| app/diagnostics/checkout.tsx | 274 | تأكيد الحجز |
| app/diagnostics/checkout.tsx | 274 | تأكيد ودفع |
| app/diagnostics/insurance-approval.tsx | 20 | المختبر المختار |
| app/diagnostics/insurance-approval.tsx | 93 | تمت الموافقة بنجاح! |
| app/diagnostics/insurance-approval.tsx | 93 | من قبل ${labName} |
| app/diagnostics/insurance-approval.tsx | 94 | موافقة جزئية |
| app/diagnostics/insurance-approval.tsx | 94 | تمت الموافقة على بعض التحاليل فقط |
| app/diagnostics/insurance-approval.tsx | 95 | تم الرفض |
| app/diagnostics/insurance-approval.tsx | 95 | عذراً، التغطية التأمينية لا تشمل هذه التحاليل |
| app/diagnostics/insurance-approval.tsx | 107 | مرفوض |
| app/diagnostics/insurance-approval.tsx | 159 | مغطى |
| app/diagnostics/insurance-upload.tsx | 60 | عذراً |
| app/diagnostics/insurance-upload.tsx | 60 | نحتاج إلى صلاحية الوصول للكاميرا. |
| app/diagnostics/insurance-upload.tsx | 71 | عذراً |
| app/diagnostics/insurance-upload.tsx | 71 | نحتاج إلى صلاحية الوصول لمعرض الصور. |
| app/diagnostics/insurance-upload.tsx | 288 | خطأ |
| app/diagnostics/insurance-upload.tsx | 288 | حدث خطأ أثناء رفع الطلب |
| app/diagnostics/lab-comparison.tsx | 24 | باقة الفحص الشامل |
| app/diagnostics/lab-comparison.tsx | 57 | تحديد مكان الخدمة |
| app/diagnostics/lab-comparison.tsx | 58 | هل تفضل زيارة فرع المختبر أم إرسال فني لسحب العينة من منزلك؟ |
| app/diagnostics/lab-comparison.tsx | 60 | إلغاء |
| app/diagnostics/lab-comparison.tsx | 61 | زيارة الفرع |
| app/diagnostics/lab-comparison.tsx | 63 | سحب من المنزل (+٥٠ ر.س) |
| app/diagnostics/lab/[id].tsx | 89 | 1.2 كم |
| app/diagnostics/lab/[id].tsx | 107 | تعتبر ${lab.name} من أحدث المختبرات الطبية المجهزة بأفضل التقنيات. نقدم مجموعة متكاملة من التحاليل المخبرية لضمان دقة وسرعة النتائج مع التزامنا بأعلى معايير الجودة العالمية. |
| app/diagnostics/my-results.tsx | 86 | تحاليل مخبرية |
| app/diagnostics/my-results.tsx | 87 | مختبر معتمد |
| app/diagnostics/my-results.tsx | 94 | قيد المراجعة |
| app/diagnostics/my-results.tsx | 98 | جاهز |
| app/diagnostics/my-results.tsx | 101 | تم الحجز |
| app/diagnostics/my-results.tsx | 104 | ملغي |
| app/diagnostics/my-results.tsx | 107 | تم سحب العينة |
| app/diagnostics/my-results.tsx | 110 | في المختبر للتحليل |
| app/diagnostics/my-results.tsx | 157 | تقرير PDF جاهز |
| app/diagnostics/order/[id].tsx | 40 | إلغاء الطلب |
| app/diagnostics/order/[id].tsx | 40 | هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ |
| app/diagnostics/order/[id].tsx | 41 | تراجع |
| app/diagnostics/order/[id].tsx | 42 | نعم، إلغاء |
| app/diagnostics/order/[id].tsx | 47 | تم |
| app/diagnostics/order/[id].tsx | 47 | تم إلغاء الطلب بنجاح |
| app/diagnostics/order/[id].tsx | 49 | خطأ |
| app/diagnostics/order/[id].tsx | 49 | حدث خطأ أثناء الإلغاء |
| app/diagnostics/order/[id].tsx | 58 | جاري التحميل |
| app/diagnostics/order/[id].tsx | 58 | يتم الآن تحميل التقرير بصيغة PDF... |
| app/diagnostics/order/[id].tsx | 61 | نجاح |
| app/diagnostics/order/[id].tsx | 61 | تم تحميل التقرير بنجاح وحفظه في جهازك |
| app/diagnostics/order/[id].tsx | 78 | تم الطلب |
| app/diagnostics/order/[id].tsx | 79 | قيد المراجعة |
| app/diagnostics/order/[id].tsx | 80 | جاري التحليل |
| app/diagnostics/order/[id].tsx | 81 | النتائج جاهزة |
| app/diagnostics/order/[id].tsx | 85 | التأمين |
| app/diagnostics/order/[id].tsx | 86 | مؤكد |
| app/diagnostics/order/[id].tsx | 87 | الفحص |
| app/diagnostics/order/[id].tsx | 88 | التقرير |
| app/diagnostics/order/[id].tsx | 89 | النتيجة |
| app/diagnostics/order/[id].tsx | 191 | التقارير والصور |
| app/diagnostics/order/[id].tsx | 191 | نتائج التحاليل |
| app/diagnostics/order/[id].tsx | 239 | زيارة منزلية |
| app/diagnostics/order/[id].tsx | 239 | زيارة للمختبر |
| app/diagnostics/orders.tsx | 31 | حجز تحاليل مخبرية |
| app/diagnostics/orders.tsx | 77 | النتائج جاهزة |
| app/diagnostics/orders.tsx | 79 | ملغى |
| app/diagnostics/orders.tsx | 81 | تم الطلب |
| app/diagnostics/orders.tsx | 83 | قيد المراجعة |
| app/diagnostics/orders.tsx | 85 | جاري التحليل |
| app/diagnostics/orders.tsx | 87 | جاري المعالجة |
| app/diagnostics/orders.tsx | 260 | زيارة منزلية |
| app/diagnostics/orders.tsx | 261 | زيارة للمختبر |
| app/diagnostics/package-detail.tsx | 90 | ١٠ - ١٢ ساعة |
| app/diagnostics/package-detail.tsx | 129 | تم الإضافة للسلة |
| app/diagnostics/package-detail.tsx | 129 | أضف للسلة |
| app/diagnostics/packages.tsx | 20 | الكل |
| app/diagnostics/packages.tsx | 23 | الكل |
| app/diagnostics/packages.tsx | 32 | الكل |
| app/diagnostics/packages.tsx | 41 | الكل |
| app/diagnostics/packages.tsx | 65 | ابحث عن باقة... |
| app/diagnostics/packages.tsx | 128 | باقة تحاليل شاملة |
| app/diagnostics/packages.tsx | 152 | كل المختبرات المعتمدة |
| app/diagnostics/results-history.tsx | 64 | تحاليل مخبرية |
| app/diagnostics/results-history.tsx | 65 | مختبر معتمد |
| app/diagnostics/sample-tracking.tsx | 84 | تصفح التحاليل |
| app/diagnostics/sample-tracking.tsx | 99 | تم تأكيد الحجز |
| app/diagnostics/sample-tracking.tsx | 100 | قيد المراجعة والقبول من المختبر |
| app/diagnostics/sample-tracking.tsx | 100 | تم استلام طلبك وتأكيد الموعد |
| app/diagnostics/sample-tracking.tsx | 107 | الموظف في الطريق |
| app/diagnostics/sample-tracking.tsx | 108 | يتحرك نحو عنوانك الآن |
| app/diagnostics/sample-tracking.tsx | 108 | تم وصول الموظف وسحب العينات |
| app/diagnostics/sample-tracking.tsx | 108 | يتحرك الموظف بعد تأكيد الحجز |
| app/diagnostics/sample-tracking.tsx | 115 | السحب المنزلي |
| app/diagnostics/sample-tracking.tsx | 116 | جاري سحب العينة وتجهيزها للنقل |
| app/diagnostics/sample-tracking.tsx | 116 | تم سحب العينة بنجاح |
| app/diagnostics/sample-tracking.tsx | 116 | سيتم سحب العينات فور وصول الموظف |
| app/diagnostics/sample-tracking.tsx | 123 | العينة في المختبر |
| app/diagnostics/sample-tracking.tsx | 124 | جاري تحليل العينات في المختبر |
| app/diagnostics/sample-tracking.tsx | 124 | اكتمل التحليل المخبري |
| app/diagnostics/sample-tracking.tsx | 124 | بانتظار وصول العينات إلى المختبر |
| app/diagnostics/sample-tracking.tsx | 131 | النتائج جاهزة |
| app/diagnostics/sample-tracking.tsx | 132 | النتائج متوفرة الآن في السجل |
| app/diagnostics/sample-tracking.tsx | 132 | ستصلك رسالة فور صدورها |
| app/diagnostics/sample-tracking.tsx | 139 | تحاليل مخبرية |
| app/diagnostics/sample-tracking.tsx | 173 | خطأ |
| app/diagnostics/sample-tracking.tsx | 173 | لا يمكن فتح تطبيق الاتصال |
| app/diagnostics/sample-tracking.tsx | 178 | أحمد محمد — فني مختبر |
| app/diagnostics/sample-tracking.tsx | 226 | تأكد من الصيام 10 ساعات قبل السحب إذا تطلب الفحص ذلك |
| app/diagnostics/sample-tracking.tsx | 227 | اشرب كمية كافية من الماء لتسهيل سحب الدم |
| app/diagnostics/sample-tracking.tsx | 228 | أخبر الموظف فوراً عن أي أدوية مزمنة تأخذها |
| app/diagnostics/sample-tracking.tsx | 229 | يمكنك طلب سحب العينة من فني من نفس جنسك عند الرغبة |
| app/diagnostics/search.tsx | 66 | ابحث عن تحليل... |
| app/diagnostics/technician-tracking.tsx | 79 | ${eta} دقيقة |
| app/diagnostics/technician-tracking.tsx | 81 | وصل الفني! |
| app/diagnostics/technician-tracking.tsx | 82 | جاري سحب العينة |
| app/diagnostics/technician-tracking.tsx | 85 | الفني في الطريق إليك |
| app/diagnostics/technician-tracking.tsx | 85 | الفني عندك |
| app/diagnostics/technician-tracking.tsx | 123 | في الطريق |
| app/diagnostics/technician-tracking.tsx | 123 | وصل |
| app/diagnostics/technician-tracking.tsx | 132 | تحاليل مخبرية |
| app/diagnostics/technician-tracking.tsx | 152 | اتصل بالفني |
| app/diagnostics/technician-tracking.tsx | 160 | رسالة |
| app/diagnostics/test-detail.tsx | 52 | تفاصيل الأشعة |
| app/diagnostics/test-detail.tsx | 52 | تفاصيل التحليل |
| app/diagnostics/test-detail.tsx | 71 | لا يوجد وصف متاح. |
| app/diagnostics/test-detail.tsx | 83 | لا توجد تحضيرات خاصة |
| app/diagnostics/test-detail.tsx | 94 | ٢٤ ساعة |
| app/diagnostics/test-detail.tsx | 112 | تم الإضافة للسلة |
| app/diagnostics/test-detail.tsx | 112 | أضف للسلة |
| app/drug-scanner/index.tsx | 66 | خطير |
| app/drug-scanner/index.tsx | 66 | متوسط |
| app/drug-scanner/index.tsx | 66 | خفيف |
| app/drug-scanner/index.tsx | 75 | فحص التفاعلات الثنائية |
| app/drug-scanner/index.tsx | 75 | تحليل التداخلات المعروفة |
| app/drug-scanner/index.tsx | 75 | مراجعة جرعات الأمان |
| app/drug-scanner/index.tsx | 75 | توليد التوصيات |
| app/drug-scanner/index.tsx | 193 | لا توجد تفاعلات آمنة معروفة. |
| app/emergency/sos-active.tsx | 18 | لم يتم استلام حالة طوارئ نشطة بعد. |
| app/emergency/sos-active.tsx | 29 | تم إنشاء طلب الاستغاثة. |
| app/emergency/sos-active.tsx | 33 | لا توجد استغاثة نشطة مرتبطة بحسابك. |
| app/emergency/sos-active.tsx | 38 | تعذر تحميل حالة الاستغاثة. |
| app/emergency/sos-active.tsx | 65 | تم استلام موقع الاستغاثة. |
| app/emergency/sos-active.tsx | 65 | لم يُشارك موقع مؤكد لهذه الاستغاثة بعد. |
| app/emergency/sos-active.tsx | 66 | موقع مستلم من الطلب |
| app/emergency/sos-active.tsx | 66 | الموقع غير متاح |
| app/emergency/sos-active.tsx | 79 | مركبة مخصصة: ${emergency.assigned_ambulance_id} |
| app/emergency/sos-active.tsx | 79 | جهة مخصصة: ${emergency.assigned_hospital_id} |
| app/emergency/sos-active.tsx | 79 | لم يتم تعيين مركبة أو جهة بعد. |
| app/emergency/sos-active.tsx | 91 | تم تعيين مركبة؛ ستظهر تفاصيل الطاقم عند مشاركتها من غرفة العمليات. |
| app/emergency/sos-active.tsx | 91 | لم تتم مشاركة تفاصيل الطاقم بعد. |
| app/emergency/sos-active.tsx | 113 | العودة للرئيسية |
| app/emergency/sos.tsx | 36 | تأكيد طلب الطوارئ |
| app/emergency/sos.tsx | 37 | سيتم إرسال موقعك الحالي وطلب إسعاف فوري. هل أنت متأكد؟ |
| app/emergency/sos.tsx | 39 | إلغاء |
| app/emergency/sos.tsx | 41 | نعم، أرسل طلب طوارئ |
| app/emergency/sos.tsx | 133 | جاري الإرسال... |
| app/emergency/sos.tsx | 150 | إسعاف |
| app/emergency/sos.tsx | 156 | شرطة |
| app/emergency/sos.tsx | 162 | إطفاء |
| app/emergency/sos.tsx | 168 | مرور |
| app/emergency/tracking.tsx | 50 | تم استلام النداء |
| app/emergency/tracking.tsx | 51 | سيارة الإسعاف في الطريق |
| app/emergency/tracking.tsx | 52 | الوصول إلى موقعك |
| app/emergency/tracking.tsx | 53 | نقل المريض |
| app/emergency/tracking.tsx | 73 | جاري التخصيص |
| app/emergency/tracking.tsx | 80 | جاري تتبع المركبة... |
| app/emergency/tracking.tsx | 81 | ${trackingData.distance} كم عنك |
| app/family/calendar.tsx | 30 | السبت |
| app/family/calendar.tsx | 31 | الأحد |
| app/family/calendar.tsx | 32 | الإثنين |
| app/family/calendar.tsx | 33 | الثلاثاء |
| app/family/calendar.tsx | 34 | الأربعاء |
| app/family/calendar.tsx | 35 | الخميس |
| app/family/calendar.tsx | 36 | الجمعة |
| app/family/calendar.tsx | 67 | حدث عائلي جديد |
| app/family/calendar.tsx | 68 | أدخل عنوان الحدث (مثال: موعد طبيب الأسنان لفهد): |
| app/family/calendar.tsx | 70 | إلغاء |
| app/family/calendar.tsx | 72 | إضافة |
| app/family/calendar.tsx | 96 | العائلة |
| app/family/calendar.tsx | 97 | غداً 11:00 ص |
| app/family/calendar.tsx | 114 | حذف الحدث |
| app/family/calendar.tsx | 115 | هل أنت متأكد من حذف هذا الحدث من تقويم العائلة؟ |
| app/family/calendar.tsx | 117 | إلغاء |
| app/family/calendar.tsx | 119 | حذف |
| app/family/calendar.tsx | 222 | أحداث ${DAYS[selectedDay]} |
| app/family/calendar.tsx | 224 | إضافة حدث |
| app/family/chat.tsx | 38 | أنت |
| app/family/chat.tsx | 38 | الآن |
| app/family/chat.tsx | 90 | اكتب رسالة... |
| app/family/emergency-contacts.tsx | 22 | أحمد محمد (الأب) |
| app/family/emergency-contacts.tsx | 29 | نورة أحمد (الأم) |
| app/family/emergency-contacts.tsx | 36 | خالد أحمد (الأخ) |
| app/family/emergency-contacts.tsx | 93 | جهات الطوارئ (${CONTACTS.length}) |
| app/family/emergency-contacts.tsx | 116 | طوارئ |
| app/family/emergency-contacts.tsx | 119 | SOS مفعّل |
| app/family/emergency-contacts.tsx | 135 | إضافة جهة اتصال طوارئ |
| app/family/hub.tsx | 31 | دعوة فرد |
| app/family/hub.tsx | 37 | الانضمام بكود |
| app/family/hub.tsx | 43 | تقويم مشترك |
| app/family/hub.tsx | 49 | محادثة عائلية |
| app/family/hub.tsx | 55 | مكالمة صوتية |
| app/family/hub.tsx | 61 | جهات الطوارئ |
| app/family/hub.tsx | 73 | عائلة أحمد |
| app/family/hub.tsx | 115 | ${members.length} أفراد |
| app/family/hub.tsx | 157 | أفراد العائلة |
| app/family/hub.tsx | 162 | أنت (مالك المجموعة) |
| app/family/hub.tsx | 162 | عضو عائلة |
| app/family/hub.tsx | 187 | مسؤول |
| app/family/hub.tsx | 187 | عضو |
| app/family/hub.tsx | 189 | نشط |
| app/family/invite.tsx | 68 | بيانات الفرد (اختياري) |
| app/family/invite.tsx | 69 | اسم الفرد |
| app/family/invite.tsx | 71 | زوج/ة |
| app/family/invite.tsx | 71 | ابن/ة |
| app/family/invite.tsx | 72 | والد/ة |
| app/family/invite.tsx | 72 | آخر |
| app/family/invite.tsx | 78 | طريقة الدعوة |
| app/family/invite.tsx | 80 | لينك |
| app/family/invite.tsx | 82 | كود |
| app/family/invite.tsx | 93 | مشاركة الرابط |
| app/family/invite.tsx | 118 | تم النسخ! |
| app/family/invite.tsx | 118 | نسخ الكود |
| app/family/join.tsx | 36 | عضو عائلة |
| app/family/join.tsx | 41 | المجموعة العائلية |
| app/family/join.tsx | 42 | عضو |
| app/family/join.tsx | 48 | فشل الانضمام. يرجى التحقق من الكود وصلاحيته. |
| app/family/join.tsx | 83 | الذهاب للعائلة |
| app/family/join.tsx | 134 | مثال: NABDAH-F7X2K9 |
| app/family/join.tsx | 139 | بحث |
| app/family/join.tsx | 146 | مسح QR Code بالكاميرا |
| app/family/join.tsx | 193 | قبول الدعوة |
| app/family/join.tsx | 200 | رفض |
| app/family/member-health.tsx | 54 | نبض القلب |
| app/family/member-health.tsx | 57 | طبيعي |
| app/family/member-health.tsx | 61 | ضغط الدم |
| app/family/member-health.tsx | 64 | طبيعي |
| app/family/member-health.tsx | 68 | الوزن |
| app/family/member-health.tsx | 70 | كغ |
| app/family/member-health.tsx | 71 | طبيعي |
| app/family/member-health.tsx | 169 | ${member.age} سنة |
| app/family/member-health.tsx | 181 | المؤشرات الحيوية |
| app/family/member-health.tsx | 200 | الأدوية |
| app/family/member-health.tsx | 228 | الموعد القادم |
| app/family/member-health.tsx | 254 | محادثة |
| app/family/member-health.tsx | 260 | مكالمة صوتية |
| app/family/member-health.tsx | 266 | حجز موعد نيابةً |
| app/family/permission-request.tsx | 30 | المؤشرات الحيوية |
| app/family/permission-request.tsx | 30 | الأدوية |
| app/family/permission-request.tsx | 30 | التقارير الطبية |
| app/family/permission-request.tsx | 31 | الوصول لبيانات |
| app/family/permission-request.tsx | 99 | عضو من العائلة |
| app/family/permission-request.tsx | 100 | اليوم |
| app/family/permission-request.tsx | 102 | طلب جديد |
| app/family/permission-request.tsx | 106 | العضو |
| app/family/permission-request.tsx | 113 | الصلاحيات المطلوبة |
| app/family/permission-request.tsx | 126 | مسموح |
| app/family/permission-request.tsx | 126 | مرفوض |
| app/family/permission-request.tsx | 145 | قبول الصلاحيات |
| app/family/permission-request.tsx | 146 | رفض الكل |
| app/family/permissions.tsx | 37 | مشاهدة المؤشرات الحيوية |
| app/family/permissions.tsx | 38 | الضغط والسكر والوزن |
| app/family/permissions.tsx | 44 | مشاهدة الأدوية |
| app/family/permissions.tsx | 45 | قائمة الأدوية والتذكيرات |
| app/family/permissions.tsx | 51 | مشاهدة التقارير |
| app/family/permissions.tsx | 52 | نتائج التحاليل والأشعة |
| app/family/permissions.tsx | 58 | مشاهدة المواعيد |
| app/family/permissions.tsx | 59 | مواعيد الأطباء والاستشارات |
| app/family/permissions.tsx | 65 | الحجز نيابةً |
| app/family/permissions.tsx | 66 | حجز مواعيد واستشارات |
| app/family/permissions.tsx | 72 | الطلب من الصيدلية |
| app/family/permissions.tsx | 73 | طلب أدوية نيابةً |
| app/family/permissions.tsx | 79 | الدفع نيابةً |
| app/family/permissions.tsx | 80 | الدفع من محفظتك لهذا الفرد |
| app/family/permissions.tsx | 86 | مشاركة الموقع |
| app/family/permissions.tsx | 87 | الوصول لموقع الفرد عند الطوارئ |
| app/family/permissions.tsx | 93 | إشعارات الطوارئ |
| app/family/permissions.tsx | 94 | استلام تنبيه عند طلب SOS |
| app/family/permissions.tsx | 106 | فرد من العائلة |
| app/family/permissions.tsx | 107 | قريب |
| app/family/permissions.tsx | 147 | خطأ |
| app/family/permissions.tsx | 147 | تعذر إرسال طلب الصلاحيات |
| app/family/permissions.tsx | 155 | تأكيد الإزالة |
| app/family/permissions.tsx | 156 | هل أنت متأكد من رغبتك في إزالة ${memberName} من العائلة؟ |
| app/family/permissions.tsx | 158 | إلغاء |
| app/family/permissions.tsx | 160 | إزالة |
| app/family/permissions.tsx | 286 | إزالة الفرد من العائلة |
| app/family/permissions.tsx | 343 | طلب تعديل الصلاحيات |
| app/family/shared-calendar.tsx | 29 | السبت |
| app/family/shared-calendar.tsx | 30 | الأحد |
| app/family/shared-calendar.tsx | 31 | الإثنين |
| app/family/shared-calendar.tsx | 32 | الثلاثاء |
| app/family/shared-calendar.tsx | 33 | الأربعاء |
| app/family/shared-calendar.tsx | 34 | الخميس |
| app/family/shared-calendar.tsx | 35 | الجمعة |
| app/family/shared-calendar.tsx | 66 | حدث عائلي جديد |
| app/family/shared-calendar.tsx | 67 | أدخل عنوان الحدث (مثال: موعد طبيب الأسنان لفهد): |
| app/family/shared-calendar.tsx | 69 | إلغاء |
| app/family/shared-calendar.tsx | 71 | إضافة |
| app/family/shared-calendar.tsx | 96 | العائلة |
| app/family/shared-calendar.tsx | 97 | غداً 11:00 ص |
| app/family/shared-calendar.tsx | 114 | حذف الحدث |
| app/family/shared-calendar.tsx | 115 | هل أنت متأكد من حذف هذا الحدث من تقويم العائلة؟ |
| app/family/shared-calendar.tsx | 117 | إلغاء |
| app/family/shared-calendar.tsx | 119 | حذف |
| app/family/shared-calendar.tsx | 223 | أحداث ${DAYS[selectedDay]} |
| app/family/shared-calendar.tsx | 225 | إضافة حدث |
| app/family/voice-call.tsx | 54 | رفع الصوت |
| app/family/voice-call.tsx | 54 | كتم |
| app/family/voice-call.tsx | 60 | مكبّر |
| app/family/voice-call.tsx | 66 | رسالة |
| app/health/chronic-disease.tsx | 54 | حالة |
| app/health/chronic-disease.tsx | 54 | تحت السيطرة |
| app/health/chronic-disease.tsx | 54 | أدوية |
| app/health/chronic-disease.tsx | 69 | تحت السيطرة |
| app/health/chronic-disease.tsx | 69 | يحتاج متابعة |
| app/health/chronic-disease.tsx | 89 | تشخيص في |
| app/health/chronic-disease.tsx | 90 | الطبيب المعالج |
| app/health/chronic-disease.tsx | 91 | آخر فحص |
| app/health/chronic-disease.tsx | 92 | الفحص القادم |
| app/health/chronic-medications.tsx | 82 | قارب على النفاد! |
| app/health/chronic-medications.tsx | 82 | المتبقي |
| app/health/chronic-medications.tsx | 103 | طلب من الصيدلية الآن |
| app/health/chronic-medications.tsx | 109 | إضافة دواء مزمن جديد |
| app/health/conditions-allergies.tsx | 27 | السكري النوع الأول |
| app/health/conditions-allergies.tsx | 28 | السكري النوع الثاني |
| app/health/conditions-allergies.tsx | 29 | ضغط الدم المرتفع |
| app/health/conditions-allergies.tsx | 30 | ارتفاع الكوليسترول |
| app/health/conditions-allergies.tsx | 31 | الربو |
| app/health/conditions-allergies.tsx | 32 | حساسية الصدر |
| app/health/conditions-allergies.tsx | 33 | قصور الغدة الدرقية |
| app/health/conditions-allergies.tsx | 34 | فرط نشاط الغدة الدرقية |
| app/health/conditions-allergies.tsx | 35 | أمراض القلب |
| app/health/conditions-allergies.tsx | 36 | القصور الكلوي |
| app/health/conditions-allergies.tsx | 37 | التهاب المفاصل الروماتويدي |
| app/health/conditions-allergies.tsx | 38 | هشاشة العظام |
| app/health/conditions-allergies.tsx | 39 | الصرع |
| app/health/conditions-allergies.tsx | 40 | الاكتئاب |
| app/health/conditions-allergies.tsx | 41 | القلق المزمن |
| app/health/conditions-allergies.tsx | 42 | فقر الدم |
| app/health/conditions-allergies.tsx | 43 | النقرس |
| app/health/conditions-allergies.tsx | 44 | الأكزيما |
| app/health/conditions-allergies.tsx | 48 | بنسلين |
| app/health/conditions-allergies.tsx | 49 | أسبرين |
| app/health/conditions-allergies.tsx | 50 | سلفا |
| app/health/conditions-allergies.tsx | 51 | إيبوبروفين |
| app/health/conditions-allergies.tsx | 52 | لاتكس |
| app/health/conditions-allergies.tsx | 53 | فول سوداني |
| app/health/conditions-allergies.tsx | 54 | بيض |
| app/health/conditions-allergies.tsx | 55 | حليب |
| app/health/conditions-allergies.tsx | 56 | قمح |
| app/health/conditions-allergies.tsx | 57 | جلوتين |
| app/health/conditions-allergies.tsx | 58 | سمك |
| app/health/conditions-allergies.tsx | 59 | مكسرات |
| app/health/conditions-allergies.tsx | 60 | صويا |
| app/health/conditions-allergies.tsx | 61 | غبار |
| app/health/conditions-allergies.tsx | 62 | حبوب اللقاح |
| app/health/conditions-allergies.tsx | 63 | وبر الحيوانات |
| app/health/conditions-allergies.tsx | 64 | العفن |
| app/health/conditions-allergies.tsx | 151 | الأمراض المزمنة |
| app/health/conditions-allergies.tsx | 155 | ابحث عن مرض... |
| app/health/conditions-allergies.tsx | 211 | الحساسية |
| app/health/conditions-allergies.tsx | 215 | ابحث عن حساسية... |
| app/health/conditions-allergies.tsx | 300 | حفظ |
| app/health/edit-profile.tsx | 29 | ذكر |
| app/health/edit-profile.tsx | 29 | أنثى |
| app/health/edit-profile.tsx | 222 | الاسم الكامل |
| app/health/edit-profile.tsx | 224 | رقم الجوال |
| app/health/edit-profile.tsx | 230 | البريد الإلكتروني |
| app/health/edit-profile.tsx | 235 | تاريخ الميلاد |
| app/health/edit-profile.tsx | 237 | رقم الهوية |
| app/health/edit-profile.tsx | 435 | أضف حساسية... |
| app/health/edit-profile.tsx | 517 | جاري الحفظ... |
| app/health/edit-profile.tsx | 517 | حفظ التغييرات |
| app/health/family-hub.tsx | 32 | دعوة فرد |
| app/health/family-hub.tsx | 38 | الانضمام بكود |
| app/health/family-hub.tsx | 44 | تقويم مشترك |
| app/health/family-hub.tsx | 50 | محادثة عائلية |
| app/health/family-hub.tsx | 56 | مكالمة صوتية |
| app/health/family-hub.tsx | 62 | جهات الطوارئ |
| app/health/family-hub.tsx | 107 | عائلتي |
| app/health/family-hub.tsx | 190 | إنشاء مجموعة عائلية |
| app/health/family-hub.tsx | 197 | انضم لعائلة حالية |
| app/health/family-hub.tsx | 227 | أفراد العائلة |
| app/health/family-hub.tsx | 232 | أنت (مالك المجموعة) |
| app/health/family-hub.tsx | 232 | عضو عائلة |
| app/health/family-hub.tsx | 257 | مسؤول |
| app/health/family-hub.tsx | 257 | عضو |
| app/health/family-hub.tsx | 259 | نشط |
| app/health/health-id.tsx | 24 | بطاقة الهوية الصحية — نبض بلس\nأحمد محمد العتيبي\nفصيلة الدم: O+\nحساسية: بنسلين\nرقم الطوارئ: 0501234567 |
| app/health/health-id.tsx | 25 | بطاقتي الصحية |
| app/health/health-id.tsx | 32 | بنسلين |
| app/health/health-id.tsx | 32 | سلفا |
| app/health/health-id.tsx | 33 | ضغط الدم |
| app/health/health-id.tsx | 33 | السكري النوع الثاني |
| app/health/health-id.tsx | 35 | سارة العتيبي |
| app/health/health-id.tsx | 35 | زوجة |
| app/health/health-id.tsx | 36 | عبدالله العتيبي |
| app/health/health-id.tsx | 36 | أخ |
| app/health/health-id.tsx | 124 | الجنس |
| app/health/health-id.tsx | 124 | ذكر |
| app/health/health-id.tsx | 125 | الطول |
| app/health/health-id.tsx | 125 | 186 سم |
| app/health/health-id.tsx | 126 | الوزن |
| app/health/health-id.tsx | 126 | 78 كجم |
| app/health/health-id.tsx | 127 | فصيلة الدم |
| app/health/health-id.tsx | 169 | ميتفورمين 500mg |
| app/health/health-id.tsx | 169 | أتورفاستاتين 20mg |
| app/health/health-id.tsx | 169 | فيتامين D3 2000IU |
| app/health/medication-reminder-add.tsx | 14 | يومياً |
| app/health/medication-reminder-add.tsx | 15 | أسبوعياً |
| app/health/medication-reminder-add.tsx | 16 | شهرياً |
| app/health/medication-reminder-add.tsx | 20 | 7 أيام |
| app/health/medication-reminder-add.tsx | 21 | 14 يوم |
| app/health/medication-reminder-add.tsx | 22 | شهر |
| app/health/medication-reminder-add.tsx | 23 | 3 أشهر |
| app/health/medication-reminder-add.tsx | 24 | دائم (مزمن) |
| app/health/medication-reminder-add.tsx | 27 | 06:00 ص |
| app/health/medication-reminder-add.tsx | 27 | 08:00 ص |
| app/health/medication-reminder-add.tsx | 27 | 12:00 م |
| app/health/medication-reminder-add.tsx | 27 | 02:00 م |
| app/health/medication-reminder-add.tsx | 27 | 06:00 م |
| app/health/medication-reminder-add.tsx | 27 | 08:00 م |
| app/health/medication-reminder-add.tsx | 27 | 10:00 م |
| app/health/medication-reminder-add.tsx | 74 | اسم الدواء |
| app/health/medication-reminder-add.tsx | 75 | مثال: بنادول إكسترا 500mg |
| app/health/medication-reminder-add.tsx | 77 | البحث في الصيدلية |
| app/health/medication-reminder-add.tsx | 78 | من وصفة طبية |
| app/health/medication-reminder-add.tsx | 84 | الجرعة |
| app/health/medication-reminder-add.tsx | 115 | مواعيد الجرعات |
| app/health/medication-reminder-add.tsx | 131 | تعليمات |
| app/health/medication-reminder-add.tsx | 133 | قبل الأكل |
| app/health/medication-reminder-add.tsx | 134 | بعد الأكل |
| app/health/medication-reminder-add.tsx | 135 | أي وقت |
| app/health/medication-reminder-add.tsx | 141 | التكرار |
| app/health/medication-reminder-add.tsx | 147 | المدة |
| app/health/medication-reminder-add.tsx | 178 | طلب |
| app/health/medication-reminder-add.tsx | 186 | ملاحظات إضافية (اختياري) |
| app/health/medication-reminder-add.tsx | 190 | حفظ التذكير |
| app/health/medication-reminder-list.tsx | 116 | في الانتظار (${pending.length}) |
| app/health/medication-reminder-list.tsx | 157 | مزمن |
| app/health/medication-reminder-list.tsx | 160 | مؤجّل |
| app/health/medication-reminder-list.tsx | 166 | تم أخذها |
| app/health/medication-reminder-list.tsx | 175 | غفوة 30 دق |
| app/health/medication-reminder-list.tsx | 216 | تم أخذها (${done.length}) |
| app/health/medication-reminder-list.tsx | 243 | تم |
| app/health/medications.tsx | 28 | تذكيرات الأدوية |
| app/health/medications.tsx | 29 | جرعاتك اليومية — تم أخذها / غفوة |
| app/health/medications.tsx | 35 | إضافة تذكير جديد |
| app/health/medications.tsx | 36 | حدد الدواء والجرعة والمواعيد |
| app/health/medications.tsx | 42 | الأدوية المزمنة |
| app/health/medications.tsx | 43 | إدارة الأدوية الدائمة وإعادة الطلب |
| app/health/medications.tsx | 49 | وصفاتي الطبية |
| app/health/medications.tsx | 50 | الوصفات من أطبائك |
| app/health/medications.tsx | 56 | طلب من الصيدلية |
| app/health/medications.tsx | 57 | اطلب أدويتك مباشرة |
| app/health/medications.tsx | 63 | الأمراض والحساسية |
| app/health/medications.tsx | 64 | سجّل أمراضك وحساسيتك |
| app/health/prescriptions.tsx | 51 | وصفة |
| app/health/prescriptions.tsx | 51 | دواء |
| app/health/prescriptions.tsx | 51 | معلقة |
| app/health/refills.tsx | 27 | دواء مزمن |
| app/health/refills.tsx | 46 | تأكيد إعادة الصرف التلقائي |
| app/health/refills.tsx | 47 | هل ترغب في طلب عبوة جديدة من "${med.name}" بقيمة ${med.price} ر.س؟ سيتم الدفع تلقائياً من محفظتك وتوصيلها لعنوانك المسجل. |
| app/health/refills.tsx | 49 | إلغاء |
| app/health/refills.tsx | 51 | أعد الطلب الآن |
| app/health/refills.tsx | 65 | تم الطلب بنجاح! |
| app/health/refills.tsx | 66 | تمت الموافقة وتجهيز طلب دواء "${med.name}". سيصلك مندوب الصيدلية خلال 30 دقيقة. |
| app/health/refills.tsx | 69 | تتبع الطلب |
| app/health/refills.tsx | 107 | مستوى مخزون أدويتك المزمنة |
| app/health/refills.tsx | 120 | حرج: ${med.remainingDays} أيام متبقية |
| app/health/refills.tsx | 120 | ${med.remainingDays} يوماً متبقياً |
| app/health/refills.tsx | 140 | أعد صرف الدواء الآن |
| app/health/reminders.tsx | 82 | خطأ |
| app/health/reminders.tsx | 82 | تعذر تحديث حالة الجرعة |
| app/health/reminders.tsx | 89 | منبه الدواء التجريبي |
| app/health/reminders.tsx | 90 | طنيين المنبه المخصص... حان وقت جرعتك الطبية الآن. |
| app/health/reminders.tsx | 177 | جرعات اليوم |
| app/health/reminders.tsx | 226 | دواء |
| app/health/reminders.tsx | 261 | تم أخذ الجرعة |
| app/health/reminders.tsx | 261 | تحديد كـ تم أخذها |
| app/health/sleep-score.tsx | 16 | 11:30 م |
| app/health/sleep-score.tsx | 17 | 6:45 ص |
| app/health/sleep-score.tsx | 25 | أحد |
| app/health/sleep-score.tsx | 26 | اثنين |
| app/health/sleep-score.tsx | 27 | ثلاثاء |
| app/health/sleep-score.tsx | 28 | أربعاء |
| app/health/sleep-score.tsx | 29 | خميس |
| app/health/sleep-score.tsx | 30 | جمعة |
| app/health/sleep-score.tsx | 31 | سبت |
| app/health/sleep-score.tsx | 35 | تجنّب الشاشات قبل النوم بساعة |
| app/health/sleep-score.tsx | 36 | اضبط درجة حرارة الغرفة بين 18-20° |
| app/health/sleep-score.tsx | 37 | لا كافيين بعد الساعة 2 م |
| app/health/sleep-score.tsx | 38 | تمارين تنفس خفيفة قبل النوم |
| app/health/sleep-score.tsx | 48 | ممتاز |
| app/health/sleep-score.tsx | 48 | جيد |
| app/health/sleep-score.tsx | 48 | يحتاج تحسين |
| app/health/sleep-score.tsx | 71 | إجمالي النوم |
| app/health/sleep-score.tsx | 71 | ${SLEEP_DATA.totalHours}س |
| app/health/sleep-score.tsx | 72 | وقت النوم |
| app/health/sleep-score.tsx | 73 | وقت الاستيقاظ |
| app/health/sleep-score.tsx | 74 | الاستيقاظات |
| app/health/sleep-score.tsx | 94 | نوم عميق |
| app/health/sleep-score.tsx | 94 | 1.5-2 ساعة |
| app/health/sleep-score.tsx | 95 | نوم REM |
| app/health/sleep-score.tsx | 95 | 1.5-2 ساعة |
| app/health/sleep-score.tsx | 96 | نوم خفيف |
| app/health/sleep-score.tsx | 96 | 3-4 ساعات |
| app/health/sleep-tracker.tsx | 13 | نوم عميق |
| app/health/sleep-tracker.tsx | 14 | نوم خفيف |
| app/health/sleep-tracker.tsx | 15 | حركة العيون السريعة |
| app/health/sleep-tracker.tsx | 16 | صحيان |
| app/health/sleep-tracker.tsx | 20 | الأحد |
| app/health/sleep-tracker.tsx | 21 | الاثنين |
| app/health/sleep-tracker.tsx | 22 | الثلاثاء |
| app/health/sleep-tracker.tsx | 23 | الأربعاء |
| app/health/sleep-tracker.tsx | 24 | الخميس |
| app/health/sleep-tracker.tsx | 25 | الجمعة |
| app/health/sleep-tracker.tsx | 26 | السبت |
| app/health/sleep-tracker.tsx | 30 | ممتاز |
| app/health/sleep-tracker.tsx | 30 | جيد |
| app/health/sleep-tracker.tsx | 30 | متوسط |
| app/health/sleep-tracker.tsx | 30 | ضعيف |
| app/health/sleep-tracker.tsx | 119 | اذهب للنوم في نفس الوقت يومياً |
| app/health/sleep-tracker.tsx | 120 | تجنب الشاشات قبل النوم بساعة |
| app/health/sleep-tracker.tsx | 121 | الحفاظ على درجة حرارة باردة |
| app/health/sleep-tracker.tsx | 122 | تجنب الكافيين بعد الساعة 3 م |
| app/health/smart-reminders.tsx | 31 | قياس الضغط |
| app/health/smart-reminders.tsx | 31 | يومياً في الصباح |
| app/health/smart-reminders.tsx | 31 | 8:00 ص |
| app/health/smart-reminders.tsx | 31 | يومي |
| app/health/smart-reminders.tsx | 32 | دواء ميتفورمين |
| app/health/smart-reminders.tsx | 32 | مع وجبة الغداء |
| app/health/smart-reminders.tsx | 32 | 1:00 م |
| app/health/smart-reminders.tsx | 32 | يومي |
| app/health/smart-reminders.tsx | 33 | شرب الماء |
| app/health/smart-reminders.tsx | 33 | AI يقترح كل ساعتين |
| app/health/smart-reminders.tsx | 33 | كل ساعتين |
| app/health/smart-reminders.tsx | 33 | ذكي |
| app/health/smart-reminders.tsx | 34 | قياس السكر |
| app/health/smart-reminders.tsx | 34 | قبل النوم |
| app/health/smart-reminders.tsx | 34 | 10:00 م |
| app/health/smart-reminders.tsx | 34 | يومي |
| app/health/smart-reminders.tsx | 35 | تمرين رياضي |
| app/health/smart-reminders.tsx | 35 | AI لاحظ نشاطك يرتفع مساءً |
| app/health/smart-reminders.tsx | 35 | 6:00 م |
| app/health/smart-reminders.tsx | 35 | ذكي |
| app/health/smart-reminders.tsx | 36 | فحص الوزن |
| app/health/smart-reminders.tsx | 36 | أسبوعياً — الجمعة صباحاً |
| app/health/smart-reminders.tsx | 36 | الجمعة 7:00 ص |
| app/health/smart-reminders.tsx | 36 | أسبوعي |
| app/health/smart-reminders.tsx | 40 | لاحظت أنك تنسى دواءك بين الساعة 1–3 م. هل تريد تعديل وقت التذكير؟ |
| app/health/smart-reminders.tsx | 41 | تحقق الضغط لديك في الصباح يُظهر أرقاماً أفضل — AI يقترح الاستمرار |
| app/health/smart-reminders.tsx | 42 | منذ 3 أسابيع لم تقس السكر قبل النوم. هل تريد إعادة التفعيل؟ |
| app/health/smart-reminders.tsx | 62 | دواء |
| app/health/smart-reminders.tsx | 62 | دواء |
| app/health/smart-reminders.tsx | 78 | تذكير نشط |
| app/health/smart-reminders.tsx | 79 | مجموع الأيام |
| app/health/smart-reminders.tsx | 80 | AI ذكي |
| app/health/smart-reminders.tsx | 93 | الكل |
| app/health/smart-reminders.tsx | 93 | AI ذكي |
| app/health/smart-reminders.tsx | 93 | أدوية |
| app/health/smart-reminders.tsx | 158 | ذكي |
| app/health/smart-reminders.tsx | 159 | ذكي |
| app/health/trends.tsx | 32 | أسبوع |
| app/health/trends.tsx | 33 | شهر |
| app/health/trends.tsx | 34 | 3 أشهر |
| app/health/trends.tsx | 35 | 6 أشهر |
| app/health/trends.tsx | 36 | سنة |
| app/health/trends.tsx | 290 | ضمن الطبيعي |
| app/health/trends.tsx | 290 | خارج الطبيعي |
| app/health/trends.tsx | 398 | أعلى قيمة |
| app/health/trends.tsx | 403 | أدنى قيمة |
| app/health/trends.tsx | 408 | المتوسط |
| app/health/trends.tsx | 413 | عدد القراءات |
| app/health/trends.tsx | 454 | طبيعي |
| app/health/trends.tsx | 454 | مراقبة |
| app/health/vitals-log.tsx | 19 | ضغط الدم |
| app/health/vitals-log.tsx | 20 | السكر |
| app/health/vitals-log.tsx | 21 | الوزن |
| app/health/vitals-log.tsx | 21 | كغ |
| app/health/vitals-log.tsx | 22 | ضربات القلب |
| app/health/vitals-log.tsx | 22 | نبضة/دقيقة |
| app/health/vitals-log.tsx | 26 | عشوائي |
| app/health/vitals-log.tsx | 27 | صائم |
| app/health/vitals-log.tsx | 28 | بعد الأكل |
| app/health/vitals-log.tsx | 29 | تراكمي HbA1c |
| app/health/vitals-log.tsx | 161 | طبيعي |
| app/health/vitals-log.tsx | 161 | مرتفع |
| app/health/vitals-log.tsx | 166 | يوم |
| app/health/vitals-log.tsx | 166 | أسبوع |
| app/health/vitals-log.tsx | 167 | شهر |
| app/health/vitals-log.tsx | 167 | سنة |
| app/health/vitals-log.tsx | 172 | ${config.label} — آخر ${periodLabels[period]} |
| app/health/vitals-log.tsx | 188 | آخر القراءات |
| app/health/vitals-log.tsx | 232 | الانقباضي |
| app/health/vitals-log.tsx | 234 | الانبساطي |
| app/health/vitals-log.tsx | 237 | القراءة (${config.unit}) |
| app/health/vitals-log.tsx | 245 | صباحاً |
| app/health/vitals-log.tsx | 246 | ظهراً |
| app/health/vitals-log.tsx | 247 | مساءً |
| app/health/vitals-log.tsx | 250 | حفظ القراءة |
| app/health/vitals.tsx | 30 | ضغط الدم |
| app/health/vitals.tsx | 34 | طبيعي |
| app/health/vitals.tsx | 38 | السكر (صائم) |
| app/health/vitals.tsx | 42 | طبيعي |
| app/health/vitals.tsx | 46 | ضربات القلب |
| app/health/vitals.tsx | 48 | نبضة |
| app/health/vitals.tsx | 50 | مثالي |
| app/health/vitals.tsx | 54 | الوزن |
| app/health/vitals.tsx | 56 | كغ |
| app/health/vitals.tsx | 58 | ثابت |
| app/health/vitals.tsx | 62 | الحرارة |
| app/health/vitals.tsx | 66 | طبيعي |
| app/health/vitals.tsx | 70 | الماء اليوم |
| app/health/vitals.tsx | 72 | أكواب |
| app/health/vitals.tsx | 74 | جيد |
| app/health/vitals.tsx | 175 | إضافة قراءة جديدة |
| app/health/vitals.tsx | 181 | عرض الرسوم البيانية |
| app/health/wearables.tsx | 133 | متصل |
| app/health/wearables.tsx | 133 | غير متصل |
| app/insurance/add-policy.tsx | 89 | رقم البوليصة |
| app/insurance/add-policy.tsx | 90 | رقم العضوية / الهوية الوطنية |
| app/insurance/add-policy.tsx | 106 | جاري التحقق... |
| app/insurance/add-policy.tsx | 106 | حفظ البوليصة غير متاح |
| app/insurance/approval-pending.tsx | 62 | ادفع كاش — ${totalAmount} ر.س |
| app/insurance/approval-pending.tsx | 63 | اتصل بشركة التأمين |
| app/insurance/approval-pending.tsx | 64 | إلغاء |
| app/insurance/approval-pending.tsx | 121 | تأكيد ودفع ${copayAmount} ر.س |
| app/insurance/approval-pending.tsx | 121 | تأكيد (بدون دفع) |
| app/insurance/claim-tracking.tsx | 14 | موافق عليه |
| app/insurance/claim-tracking.tsx | 15 | قيد المراجعة |
| app/insurance/copay.tsx | 34 | فشل إتمام الدفع |
| app/insurance/copay.tsx | 46 | تم الدفع بنجاح |
| app/insurance/copay.tsx | 48 | تم تحصيل نسبة التحمل بنجاح. يمكنك الآن المتابعة مع طبيبك. |
| app/insurance/copay.tsx | 56 | موافقة التأمين |
| app/insurance/copay.tsx | 61 | مطلوب دفع نسبة التحمل |
| app/insurance/copay.tsx | 64 | كود الموافقة من نفييس: |
| app/insurance/copay.tsx | 69 | المبلغ المطلوب دفعه |
| app/insurance/copay.tsx | 70 | ر.س |
| app/insurance/copay.tsx | 78 | جاري الدفع... |
| app/insurance/copay.tsx | 78 | تأكيد الدفع |
| app/insurance/coverage-check.tsx | 13 | استشارة طبيب |
| app/insurance/coverage-check.tsx | 13 | قلب، باطنة، أطفال |
| app/insurance/coverage-check.tsx | 14 | تحاليل مخبرية |
| app/insurance/coverage-check.tsx | 14 | فحص شامل، فيتامينات |
| app/insurance/coverage-check.tsx | 15 | أشعة وتشخيص |
| app/insurance/coverage-check.tsx | 15 | سينية، رنين، مقطعية |
| app/insurance/coverage-check.tsx | 16 | تمريض منزلي |
| app/insurance/coverage-check.tsx | 16 | مغذي، غيار جروح |
| app/insurance/coverage-check.tsx | 50 | فحص شبكة المزودين |
| app/insurance/coverage-check.tsx | 50 | حساب نسبة التغطية |
| app/insurance/coverage-check.tsx | 50 | التحقق من الحد السنوي |
| app/insurance/coverage-check.tsx | 64 | مزود الخدمة |
| app/insurance/coverage-check.tsx | 66 | تأمين نبض |
| app/insurance/coverage-check.tsx | 67 | خدمة طبية |
| app/insurance/coverage-check.tsx | 76 | سعر الخدمة المقدر |
| app/insurance/coverage-check.tsx | 77 | تغطية الشركة |
| app/insurance/coverage-check.tsx | 78 | تحمّل المريض |
| app/insurance/coverage-check.tsx | 239 | اسم الطبيب أو المستشفى أو الصيدلية |
| app/insurance/hub.tsx | 102 | شامل طبي |
| app/insurance/hub.tsx | 103 | غير محدد |
| app/insurance/hub.tsx | 146 | انتهت المهلة |
| app/insurance/hub.tsx | 146 | لم يتم العثور على نتائج تأمين. تأكد من إدخال رقم الهوية والضغط على استعلام. |
| app/insurance/hub.tsx | 150 | خطأ في الاستعلام |
| app/insurance/hub.tsx | 150 | تعذّر جلب بيانات التأمين من بوابة الضمان. |
| app/insurance/hub.tsx | 176 | , `شركة التأمين: ${item.company}\nرقم البوليصة: ${item.policy_number}\nالفئة: ${item.class}\nشبكة: ${item.network}`, [{ text: |
| app/insurance/hub.tsx | 188 | خطأ |
| app/insurance/hub.tsx | 188 | تم سحب البيانات لكن فشل حفظها. يرجى المحاولة لاحقاً. |
| app/insurance/hub.tsx | 235 | رقم العضوية |
| app/insurance/hub.tsx | 236 | ينتهي في |
| app/insurance/hub.tsx | 237 | الشبكة |
| app/insurance/hub.tsx | 302 | استشارات |
| app/insurance/hub.tsx | 303 | أدوية |
| app/insurance/hub.tsx | 304 | تحاليل |
| app/insurance/hub.tsx | 305 | تنويم |
| app/insurance/hub.tsx | 306 | أسنان |
| app/insurance/hub.tsx | 307 | نظارات |
| app/insurance/hub.tsx | 409 | موافق |
| app/insurance/hub.tsx | 409 | استرداد |
| app/insurance/hub.tsx | 409 | قيد المراجعة |
| app/insurance/hub.tsx | 437 | استعلام |
| app/insurance/network-providers.tsx | 80 | ابحث عن مزود... |
| app/insurance/payment-split.tsx | 25 | استشارة طب قلب |
| app/insurance/payment-split.tsx | 26 | د. أحمد محمد السيد |
| app/insurance/payment-split.tsx | 29 | اليوم، الأحد 16 يونيو |
| app/insurance/payment-split.tsx | 30 | 10:00 صباحاً |
| app/insurance/payment-split.tsx | 50 | بوبا للتأمين |
| app/insurance/payment-split.tsx | 289 | إجمالي الخدمة |
| app/insurance/payment-split.tsx | 289 | ${SERVICE.totalAmount} ريال |
| app/insurance/payment-split.tsx | 290 | تغطية ${INSURANCE_POLICY.company} |
| app/insurance/payment-split.tsx | 290 | ${companyPays} ريال- |
| app/insurance/payment-split.tsx | 291 | حصتك (تدفع الآن) |
| app/insurance/payment-split.tsx | 291 | ${patientPays} ريال |
| app/insurance/payment-split.tsx | 320 | جاري التأكيد... |
| app/insurance/payment-split.tsx | 321 | تأكيد الدفع — ${patientPays} ريال |
| app/insurance/policy-detail.tsx | 21 | شركة التأمين |
| app/insurance/policy-detail.tsx | 21 | بوبا للتأمين |
| app/insurance/policy-detail.tsx | 22 | رقم البوليصة |
| app/insurance/policy-detail.tsx | 23 | تاريخ البداية |
| app/insurance/policy-detail.tsx | 23 | 1 يناير 2024 |
| app/insurance/policy-detail.tsx | 24 | تاريخ الانتهاء |
| app/insurance/policy-detail.tsx | 24 | 31 ديسمبر 2024 |
| app/insurance/policy-detail.tsx | 25 | الحد الأقصى السنوي |
| app/insurance/policy-detail.tsx | 25 | 500,000 ريال |
| app/insurance/policy-detail.tsx | 26 | الحد المستخدم |
| app/insurance/policy-detail.tsx | 26 | 45,000 ريال |
| app/insurance/policy-detail.tsx | 27 | نسبة التحمل |
| app/insurance/policy-detail.tsx | 28 | الحد الأدنى للتحمل |
| app/insurance/policy-detail.tsx | 28 | 50 ريال |
| app/insurance/refund-status.tsx | 41 | استشارة قلب |
| app/insurance/refund-status.tsx | 43 | تم الاسترداد |
| app/insurance/refund-status.tsx | 45 | 5 يونيو |
| app/insurance/refund-status.tsx | 49 | تحليل CBC |
| app/insurance/refund-status.tsx | 51 | قيد المراجعة |
| app/insurance/refund-status.tsx | 53 | 1 يونيو |
| app/insurance/submit-claim.tsx | 34 | تم تقديم المطالبة |
| app/insurance/submit-claim.tsx | 34 | سيتم مراجعتها خلال 2-5 أيام عمل |
| app/insurance/submit-claim.tsx | 36 | خطأ |
| app/insurance/submit-claim.tsx | 36 | تعذر تقديم المطالبة |
| app/insurance/submit-claim.tsx | 75 | الخيارات |
| app/loyalty/challenges.tsx | 113 | مكتمل |
| app/loyalty/challenges.tsx | 113 | جارٍ |
| app/loyalty/challenges.tsx | 130 | 30 يونيو |
| app/loyalty/hub.tsx | 19 | برونزي |
| app/loyalty/hub.tsx | 19 | 5% كاشباك |
| app/loyalty/hub.tsx | 23 | استشارة طبية |
| app/loyalty/hub.tsx | 197 | اكسب نقاطاً |
| app/loyalty/hub.tsx | 197 | استبدال |
| app/loyalty/hub.tsx | 197 | السجل |
| app/loyalty/hub.tsx | 285 | استبدل |
| app/loyalty/hub.tsx | 285 | غير كافٍ |
| app/loyalty/hub.tsx | 293 | خصومات |
| app/loyalty/hub.tsx | 293 | خدمات |
| app/loyalty/leaderboard.tsx | 21 | سارة العتيبي |
| app/loyalty/leaderboard.tsx | 29 | محمد القحطاني |
| app/loyalty/leaderboard.tsx | 37 | فاطمة السيد |
| app/loyalty/leaderboard.tsx | 45 | أحمد العتيبي (أنت) |
| app/loyalty/leaderboard.tsx | 54 | خالد المطيري |
| app/loyalty/leaderboard.tsx | 62 | نورة الغامدي |
| app/loyalty/leaderboard.tsx | 70 | عبدالله الدوسري |
| app/loyalty/leaderboard.tsx | 215 | ← أنت |
| app/loyalty/referrals.tsx | 28 | خالد الحربي |
| app/loyalty/referrals.tsx | 30 | تم التسجيل — في انتظار أول حجز |
| app/loyalty/referrals.tsx | 31 | 18 يونيو 2026 |
| app/loyalty/referrals.tsx | 32 | +50 ر.س معلقة |
| app/loyalty/referrals.tsx | 36 | عمر فاروق |
| app/loyalty/referrals.tsx | 38 | حجز مكتمل — تمت الإضافة للمحفظة |
| app/loyalty/referrals.tsx | 39 | 10 يونيو 2026 |
| app/loyalty/referrals.tsx | 40 | +50 ر.س مضافة |
| app/loyalty/referrals.tsx | 44 | سليمان العتيبي |
| app/loyalty/referrals.tsx | 46 | حجز مكتمل — تمت الإضافة للمحفظة |
| app/loyalty/referrals.tsx | 47 | 01 يونيو 2026 |
| app/loyalty/referrals.tsx | 48 | +50 ر.س مضافة |
| app/loyalty/referrals.tsx | 60 | نسخ الكود |
| app/loyalty/referrals.tsx | 60 | تم نسخ كود الإحالة الخاص بك بنجاح! |
| app/loyalty/referrals.tsx | 99 | كيف يعمل البرنامج؟ |
| app/loyalty/referrals.tsx | 100 | عند مشاركة الكود الخاص بك مع صديق، يحصل الصديق على 50 ر.س خصم فوري عند أول حجز. وبمجرد اكتمال حجزه، يتم إيداع 50 ر.س رصيد مسترجع في محفظتك! |
| app/loyalty/referrals.tsx | 171 | نسخ الكود |
| app/loyalty/referrals.tsx | 178 | مشاركة الكود |
| app/loyalty/referrals.tsx | 208 | سجل الإحالات والمدعوين |
| app/loyalty/rewards.tsx | 44 | رصيد غير كافٍ |
| app/loyalty/rewards.tsx | 44 | عذراً، لا تملك نقاطاً كافية لاستبدال هذه المكافأة. |
| app/loyalty/rewards.tsx | 49 | تأكيد الاستبدال |
| app/loyalty/rewards.tsx | 50 | هل تريد استبدال ${reward.points_required} نقطة مقابل ${reward.title}؟ |
| app/loyalty/rewards.tsx | 52 | إلغاء |
| app/loyalty/rewards.tsx | 54 | استبدال |
| app/loyalty/rewards.tsx | 64 | تم الاستبدال بنجاح |
| app/loyalty/rewards.tsx | 65 | كود الكوبون الخاص بك هو: ${res.coupon_code \|\| 'NAB-FREE'}\nيمكنك استخدامه عند الدفع. |
| app/loyalty/rewards.tsx | 66 | حسناً |
| app/loyalty/rewards.tsx | 70 | خطأ |
| app/loyalty/rewards.tsx | 70 | حدث خطأ أثناء استبدال المكافأة. يرجى المحاولة لاحقاً. |
| app/loyalty/rewards.tsx | 111 | المكافآت المتاحة |
| app/map/index.tsx | 32 | الكل |
| app/map/index.tsx | 33 | أطباء |
| app/map/index.tsx | 34 | مستشفيات |
| app/map/index.tsx | 35 | صيدليات |
| app/map/index.tsx | 36 | مختبرات |
| app/map/index.tsx | 37 | تمريض |
| app/map/index.tsx | 177 | مزود خدمة |
| app/map/index.tsx | 412 | ابحث عن دكتور، صيدلية، مستشفى... |
| app/map/index.tsx | 503 | مفتوح |
| app/map/index.tsx | 503 | مغلق |
| app/map/index.tsx | 565 | ${selectedProvider.distance} كم |
| app/map/index.tsx | 565 | المسافة |
| app/map/index.tsx | 566 | ${selectedProvider.eta} د |
| app/map/index.tsx | 566 | الوصول |
| app/map/index.tsx | 569 | ${selectedProvider.price} ر.س |
| app/map/index.tsx | 569 | السعر |
| app/map/index.tsx | 633 | تسوق المنتجات |
| app/map/index.tsx | 634 | احجز فحص |
| app/map/index.tsx | 635 | اطلب تمريض |
| app/map/index.tsx | 636 | احجز موعد |
| app/maternity/baby-development.tsx | 33 | بذرة خشخاش |
| app/maternity/baby-development.tsx | 33 | 0.1 مم |
| app/maternity/baby-development.tsx | 33 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 33 | الثلث الأول |
| app/maternity/baby-development.tsx | 34 | تبدأ الدورة الشهرية وتجهيز بطانة الرحم للاحتضان وتكبير الجريب. |
| app/maternity/baby-development.tsx | 35 | انقسام الخلية البكر في اتجاه الرحم |
| app/maternity/baby-development.tsx | 35 | تجهيز بطانة الرحم وتثبيت الهرمونات |
| app/maternity/baby-development.tsx | 36 | تناولي حمض الفوليك (400 ميكروجرام) يومياً. |
| app/maternity/baby-development.tsx | 36 | تجنبي التدخين والكافيين تماماً. |
| app/maternity/baby-development.tsx | 39 | بذرة سمسم |
| app/maternity/baby-development.tsx | 39 | 0.2 مم |
| app/maternity/baby-development.tsx | 39 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 39 | الثلث الأول |
| app/maternity/baby-development.tsx | 40 | تحدث عملية الإباضة وتلتقي البويضة بالحيوان المنوي لتشكيل الزيجوت. |
| app/maternity/baby-development.tsx | 41 | حدوث التخصيب وانقسام النواة الأولى |
| app/maternity/baby-development.tsx | 41 | تحرك البويضة الملقحة نحو جدار الرحم |
| app/maternity/baby-development.tsx | 42 | حافظي على علاقة زوجية منتظمة في أيام الخصوبة. |
| app/maternity/baby-development.tsx | 42 | احرصي على تناول الفيتامينات والمعادن. |
| app/maternity/baby-development.tsx | 45 | بذرة خردل |
| app/maternity/baby-development.tsx | 45 | 0.3 مم |
| app/maternity/baby-development.tsx | 45 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 45 | الثلث الأول |
| app/maternity/baby-development.tsx | 46 | تنغرس البويضة المخصبة (الكيسة الأريمية) في بطانة الرحم الغنية بالدم. |
| app/maternity/baby-development.tsx | 47 | انغراس الكيسة الأريمية وتثبيت الحمل أولياً |
| app/maternity/baby-development.tsx | 47 | بدء إفراز هرمون الحمل HCG |
| app/maternity/baby-development.tsx | 48 | قد تشعرين بنزف الانغراس الخفيف وهو طبيعي. |
| app/maternity/baby-development.tsx | 48 | تجنبي المجهود البدني العنيف. |
| app/maternity/baby-development.tsx | 51 | بذرة خشخاش كبيرة |
| app/maternity/baby-development.tsx | 51 | 1 مم |
| app/maternity/baby-development.tsx | 51 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 51 | الثلث الأول |
| app/maternity/baby-development.tsx | 52 | يتكون الأنبوب العصبي الذي سيشكل الدماغ والحبل الشوكي للجنين. |
| app/maternity/baby-development.tsx | 53 | تكون الطبقات الجنينية الثلاث الأساسية |
| app/maternity/baby-development.tsx | 53 | تكون الأنبوب العصبي والحبل الشوكي البدائي |
| app/maternity/baby-development.tsx | 54 | قومي بعمل اختبار حمل منزلي لتأكيد النتيجة. |
| app/maternity/baby-development.tsx | 54 | احجزي موعدك الأول مع الطبيبة. |
| app/maternity/baby-development.tsx | 57 | حبة سمسم |
| app/maternity/baby-development.tsx | 57 | 2 مم |
| app/maternity/baby-development.tsx | 57 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 57 | الثلث الأول |
| app/maternity/baby-development.tsx | 58 | يبدأ القلب البدائي بالنبض، وتتشكل براعم صغيرة ستصبح الأطراف. |
| app/maternity/baby-development.tsx | 59 | النبض الأول للقلب البدائي للجنين |
| app/maternity/baby-development.tsx | 59 | تكون الحبل السري الأولي لتغذية الجنين |
| app/maternity/baby-development.tsx | 60 | ابدئي المتابعة الدورية والفحوصات الطبية الأولى. |
| app/maternity/baby-development.tsx | 60 | تناولي وجبات خفيفة لمقاومة الغثيان الصباحي. |
| app/maternity/baby-development.tsx | 63 | حبة عدس |
| app/maternity/baby-development.tsx | 63 | 5 مم |
| app/maternity/baby-development.tsx | 63 | أقل من 1 جم |
| app/maternity/baby-development.tsx | 63 | الثلث الأول |
| app/maternity/baby-development.tsx | 64 | تتشكل ملامح الوجه الأولية مثل تجاويف العينين والأنف والأذنين. |
| app/maternity/baby-development.tsx | 65 | انقسام الدماغ لثلاثة أجزاء رئيسية |
| app/maternity/baby-development.tsx | 65 | تطور ملامح الوجه البدائية وظهور نقطتي العينين |
| app/maternity/baby-development.tsx | 66 | تناولي وجبات صغيرة مقسمة على مدار اليوم. |
| app/maternity/baby-development.tsx | 66 | اشربي الزنجبيل الدافئ لتخفيف الغثيان. |
| app/maternity/baby-development.tsx | 69 | حبة عنب بري |
| app/maternity/baby-development.tsx | 69 | 1.2 سم |
| app/maternity/baby-development.tsx | 69 | 1 جم |
| app/maternity/baby-development.tsx | 69 | الثلث الأول |
| app/maternity/baby-development.tsx | 70 | يتضاعف حجم الدماغ، وتبدأ الأصابع الصغيرة بالظهور في براعم اليدين. |
| app/maternity/baby-development.tsx | 71 | تكون نصفي الكرة المخية وتضاعف خلايا الدماغ |
| app/maternity/baby-development.tsx | 71 | تكون الغدة الدرقية وبراعم الأصابع البدائية |
| app/maternity/baby-development.tsx | 72 | تجنبي الروائح النفاذة التي تثير الغثيان. |
| app/maternity/baby-development.tsx | 72 | حافظي على روتين ترطيب خفيف للبشرة. |
| app/maternity/baby-development.tsx | 75 | حبة فاصوليا |
| app/maternity/baby-development.tsx | 75 | 1.6 سم |
| app/maternity/baby-development.tsx | 75 | 2 جم |
| app/maternity/baby-development.tsx | 75 | الثلث الأول |
| app/maternity/baby-development.tsx | 76 | تتشكل جميع الأعضاء الأساسية، وتتكون الغضاريف اللينة لعظام الجنين. |
| app/maternity/baby-development.tsx | 77 | تكون المرفقين والركبتين وبداية حركات غير محسوسة |
| app/maternity/baby-development.tsx | 77 | تطور شبكية العين وبداية بناء هيكل الأذن الداخلية |
| app/maternity/baby-development.tsx | 78 | احصلي على قسط كافٍ من النوم والراحة. |
| app/maternity/baby-development.tsx | 78 | اهتمي بتناول الألياف لتجنب الإمساك. |
| app/maternity/baby-development.tsx | 81 | حبة زيتون |
| app/maternity/baby-development.tsx | 81 | 2.3 سم |
| app/maternity/baby-development.tsx | 81 | 3 جم |
| app/maternity/baby-development.tsx | 81 | الثلث الأول |
| app/maternity/baby-development.tsx | 82 | يختفي الذيل الجنيني تماماً، وتتكون العضلات ليبدأ الجنين بالحركة. |
| app/maternity/baby-development.tsx | 83 | اختفاء الذيل الجنيني وتطور الجهاز العضلي |
| app/maternity/baby-development.tsx | 83 | تكون بصيلات الشعر وبراعم التذوق في اللسان |
| app/maternity/baby-development.tsx | 84 | اشربي الكثير من السوائل والماء (على الأقل 2 لتر يومياً). |
| app/maternity/baby-development.tsx | 84 | احرصي على تناول الحليب المدعم. |
| app/maternity/baby-development.tsx | 87 | حبة برقوق |
| app/maternity/baby-development.tsx | 87 | 3.1 سم |
| app/maternity/baby-development.tsx | 87 | 4 جم |
| app/maternity/baby-development.tsx | 87 | الثلث الأول |
| app/maternity/baby-development.tsx | 88 | تكتمل الأعضاء الحيوية وتبدأ بالعمل، وتظهر الأظافر الصغيرة جداً. |
| app/maternity/baby-development.tsx | 89 | بدء عمل الكبد والكليتين لإفراز البول والصفراء |
| app/maternity/baby-development.tsx | 89 | تكون مفاصل الأطراف وأظافر الأصابع الدقيقة |
| app/maternity/baby-development.tsx | 90 | مارسي رياضة المشي الخفيف لتنشيط الدورة الدموية. |
| app/maternity/baby-development.tsx | 90 | تجنبي الوقوف الطويل أو المفاجئ. |
| app/maternity/baby-development.tsx | 93 | حبة تين |
| app/maternity/baby-development.tsx | 93 | 4.1 سم |
| app/maternity/baby-development.tsx | 93 | 7 جم |
| app/maternity/baby-development.tsx | 93 | الثلث الأول |
| app/maternity/baby-development.tsx | 94 | يستطيع الجنين فتح وإغلاق فمه والبلع، وتتكون الأسنان اللبنية تحت اللثة. |
| app/maternity/baby-development.tsx | 95 | تكون الأسنان اللبنية تحت خط اللثة الجنيني |
| app/maternity/baby-development.tsx | 95 | تطور الأعضاء التناسلية الخارجية داخلياً |
| app/maternity/baby-development.tsx | 96 | اهتمي بالأطعمة الغنية بالكالسيوم لنمو العظام. |
| app/maternity/baby-development.tsx | 96 | احرصي على فحص مستوى فيتامين د. |
| app/maternity/baby-development.tsx | 99 | حبة ليمون |
| app/maternity/baby-development.tsx | 99 | 5.4 سم |
| app/maternity/baby-development.tsx | 99 | 14 جم |
| app/maternity/baby-development.tsx | 99 | الثلث الأول |
| app/maternity/baby-development.tsx | 100 | تكتمل ردود الأفعال ويحرك يديه، وتعمل الكلى بشكل كامل لإنتاج البول. |
| app/maternity/baby-development.tsx | 101 | اكتمال ردود الأفعال الانعكاسية (فتح وقفل قبضة اليد) |
| app/maternity/baby-development.tsx | 101 | تكون الغدة النخامية وبدء إفراز الهرمونات |
| app/maternity/baby-development.tsx | 102 | هذا آخر أسبوع في الثلث الأول، سيبدأ الغثيان بالتحسن قريباً. |
| app/maternity/baby-development.tsx | 102 | استشيري طبيبتك حول فيتامينات الثلث الثاني. |
| app/maternity/baby-development.tsx | 105 | قرن بازلاء |
| app/maternity/baby-development.tsx | 105 | 7.4 سم |
| app/maternity/baby-development.tsx | 105 | 23 جم |
| app/maternity/baby-development.tsx | 105 | الثلث الثاني |
| app/maternity/baby-development.tsx | 106 | تظهر البصمات المميزة على الأصابع، وتتشكل الحبال الصوتية للحنجرة. |
| app/maternity/baby-development.tsx | 107 | تكون البصمات على أصابع اليدين والقدمين |
| app/maternity/baby-development.tsx | 107 | تكون الحبال الصوتية البدائية وتطور البنكرياس |
| app/maternity/baby-development.tsx | 108 | ابدئي بالإعلان عن الحمل للمقربين إذا كنتِ جاهزة. |
| app/maternity/baby-development.tsx | 108 | اهتمي بتناول مكملات الحديد والبروتينات. |
| app/maternity/baby-development.tsx | 111 | حبة ليمون هندي |
| app/maternity/baby-development.tsx | 111 | 8.7 سم |
| app/maternity/baby-development.tsx | 111 | 43 جم |
| app/maternity/baby-development.tsx | 111 | الثلث الثاني |
| app/maternity/baby-development.tsx | 112 | بداية الثلث الثاني، تظهر تعبيرات الوجه المتنوعة ويبدأ الشعر بالنمو. |
| app/maternity/baby-development.tsx | 113 | نمو زغب الشعر الناعم لحماية الجلد (Lanugo) |
| app/maternity/baby-development.tsx | 113 | القدرة على مص الإبهام والعبوس والابتسام |
| app/maternity/baby-development.tsx | 114 | استغلي طاقة الثلث الثاني في تنظيم وجباتك ونشاطك الخفيف. |
| app/maternity/baby-development.tsx | 114 | نامي على وسائد مريحة لدعم الظهر. |
| app/maternity/baby-development.tsx | 117 | حبة تفاح |
| app/maternity/baby-development.tsx | 117 | 10.1 سم |
| app/maternity/baby-development.tsx | 117 | 70 جم |
| app/maternity/baby-development.tsx | 117 | الثلث الثاني |
| app/maternity/baby-development.tsx | 118 | يشعر بالضوء الخارجي من خلال جفونه المغلقة، وتتطور حاسة التذوق. |
| app/maternity/baby-development.tsx | 119 | حساسية العين للضوء الخارجي بالرغم من إغلاق الجفون |
| app/maternity/baby-development.tsx | 119 | تكون الهيكل العظمي الغضروفي وبدء تصلبه |
| app/maternity/baby-development.tsx | 120 | ارتدي ملابس قطنية فضفاضة ومريحة. |
| app/maternity/baby-development.tsx | 120 | تابعي ضغط الدم بانتظام لتجنب الارتفاع المفاجئ. |
| app/maternity/baby-development.tsx | 123 | حبة أفوكادو |
| app/maternity/baby-development.tsx | 123 | 11.6 سم |
| app/maternity/baby-development.tsx | 123 | 100 جم |
| app/maternity/baby-development.tsx | 123 | الثلث الثاني |
| app/maternity/baby-development.tsx | 124 | يضخ القلب كميات كبيرة من الدم، وقد تشعرين بحركات خفيفة للجنين. |
| app/maternity/baby-development.tsx | 125 | ضخ القلب لحوالي 25 لتر من الدم يومياً |
| app/maternity/baby-development.tsx | 125 | الشعور بأولى حركات الجنين الخفيفة (الرفرفة) |
| app/maternity/baby-development.tsx | 126 | احجزي موعد السونار التفصيلي التشريحي (Anomaly Scan). |
| app/maternity/baby-development.tsx | 126 | تجنبي الاستلقاء على الظهر لفترات طويلة. |
| app/maternity/baby-development.tsx | 129 | حبة لفت |
| app/maternity/baby-development.tsx | 129 | 13 سم |
| app/maternity/baby-development.tsx | 129 | 140 جم |
| app/maternity/baby-development.tsx | 129 | الثلث الثاني |
| app/maternity/baby-development.tsx | 130 | تتكون طبقة دهنية تحت جلد الجنين لحمايته ودفئه، وتقوى العظام. |
| app/maternity/baby-development.tsx | 131 | تراكم الدهون البنية المفيدة تحت الجلد وعزل الحرارة |
| app/maternity/baby-development.tsx | 131 | تصلب عظام الأذن الوسطى وبداية نقل الأصوات |
| app/maternity/baby-development.tsx | 132 | احرصي على النوم على الجانب الأيسر لدعم تدفق الدم للمشيمة. |
| app/maternity/baby-development.tsx | 132 | تناولي أطعمة غنية بـ أوميجا 3. |
| app/maternity/baby-development.tsx | 135 | حبة فلفل حلو |
| app/maternity/baby-development.tsx | 135 | 14.2 سم |
| app/maternity/baby-development.tsx | 135 | 190 جم |
| app/maternity/baby-development.tsx | 135 | الثلث الثاني |
| app/maternity/baby-development.tsx | 136 | تتطور حاسة السمع ويمكنه سماع نبضات قلبك والضوضاء الخارجية بوضوح. |
| app/maternity/baby-development.tsx | 137 | تطور السمع الكامل وسماع نبضات قلبك والأصوات الخارجية |
| app/maternity/baby-development.tsx | 137 | تكون طبقة الميالين حول الحبل الشوكي لحمايته |
| app/maternity/baby-development.tsx | 138 | تحدثي مع جنينك واقرئي له بصوت هادئ. |
| app/maternity/baby-development.tsx | 138 | تجنبي الأصوات العالية والضوضاء المزعجة. |
| app/maternity/baby-development.tsx | 141 | حبة طماطم كبيرة |
| app/maternity/baby-development.tsx | 141 | 15.3 سم |
| app/maternity/baby-development.tsx | 141 | 240 جم |
| app/maternity/baby-development.tsx | 141 | الثلث الثاني |
| app/maternity/baby-development.tsx | 142 | تتكون طبقة الطلاء الدهني لحماية بشرته الحساسة من السائل الأمنيوسي. |
| app/maternity/baby-development.tsx | 143 | تكون طلاء الفيرنكس الدهني (Vernix) لحماية الجلد |
| app/maternity/baby-development.tsx | 143 | تطور الحواس الخمس في الدماغ (المناطق المخصصة لها) |
| app/maternity/baby-development.tsx | 144 | استخدمي كريمات طبيعية لترطيب بطنك ومنع علامات التمدد. |
| app/maternity/baby-development.tsx | 144 | حافظي على شرب الماء بانتظام. |
| app/maternity/baby-development.tsx | 147 | حبة موز |
| app/maternity/baby-development.tsx | 147 | 25 سم |
| app/maternity/baby-development.tsx | 147 | 300 جم |
| app/maternity/baby-development.tsx | 147 | الثلث الثاني |
| app/maternity/baby-development.tsx | 148 | منتصف الحمل! يبتلع الجنين السائل الأمنيوسي، وتتطور دورات النوم واليقظة. |
| app/maternity/baby-development.tsx | 149 | ابتلاع السائل لتمرين الجهاز الهضمي والبلع |
| app/maternity/baby-development.tsx | 149 | تكون دورات نوم ويقظة شبيهة بالأطفال حديثي الولادة |
| app/maternity/baby-development.tsx | 150 | تأكدي من عمل فحص الدم والحديد للاطمئنان على مستويات الهيموجلوبين. |
| app/maternity/baby-development.tsx | 150 | خذي قسطاً من الراحة عند التعب. |
| app/maternity/baby-development.tsx | 153 | حبة جزر |
| app/maternity/baby-development.tsx | 153 | 26.7 سم |
| app/maternity/baby-development.tsx | 153 | 360 جم |
| app/maternity/baby-development.tsx | 153 | الثلث الثاني |
| app/maternity/baby-development.tsx | 154 | يزداد نشاط وحركة الجنين، ويبدأ نخاع العظم بإنتاج خلايا الدم. |
| app/maternity/baby-development.tsx | 155 | إنتاج خلايا الدم الحمراء بواسطة نخاع العظم بدلاً من الكبد |
| app/maternity/baby-development.tsx | 155 | تطور حركة الجنين لتشمل الركل والتقلب بوضوح |
| app/maternity/baby-development.tsx | 156 | ارفعي قدميك عند الجلوس لتقليل تورم الكاحلين. |
| app/maternity/baby-development.tsx | 156 | تجنبي الوقوف الطويل والمستمر. |
| app/maternity/baby-development.tsx | 159 | حبة كوسة كبيرة |
| app/maternity/baby-development.tsx | 159 | 27.8 سم |
| app/maternity/baby-development.tsx | 159 | 430 جم |
| app/maternity/baby-development.tsx | 159 | الثلث الثاني |
| app/maternity/baby-development.tsx | 160 | تتطور حاسة اللمس، وتظهر الحواجب والرموش بشكل واضح وجلي. |
| app/maternity/baby-development.tsx | 161 | ظهور الحواجب والرموش والشفتين بملامح واضحة |
| app/maternity/baby-development.tsx | 161 | استكشاف الجنين لمحيطه بلمس جدار الرحم والوجه |
| app/maternity/baby-development.tsx | 162 | احرصي على تناول اللحوم الحمراء والسبانخ لزيادة مخزون الحديد. |
| app/maternity/baby-development.tsx | 162 | مارسي تمارين كيجل بعد استشارة الطبيبة. |
| app/maternity/baby-development.tsx | 165 | حبة مانجو |
| app/maternity/baby-development.tsx | 165 | 28.9 سم |
| app/maternity/baby-development.tsx | 165 | 500 جم |
| app/maternity/baby-development.tsx | 165 | الثلث الثاني |
| app/maternity/baby-development.tsx | 166 | يبدأ الجنين بالتفاعل السريع مع الأصوات والحركة المحيطة بالأم. |
| app/maternity/baby-development.tsx | 167 | تطور الأذن الداخلية وسرعة الاستجابة للصوت الخارجي |
| app/maternity/baby-development.tsx | 167 | تكون الأوعية الدموية في الرئة استعداداً للتنفس |
| app/maternity/baby-development.tsx | 168 | حافظي على هدوئك وتجنبي التوتر لأنه يؤثر على نبض الجنين. |
| app/maternity/baby-development.tsx | 168 | احرصي على ترطيب الجسم. |
| app/maternity/baby-development.tsx | 171 | كوز ذرة |
| app/maternity/baby-development.tsx | 171 | 30 سم |
| app/maternity/baby-development.tsx | 171 | 600 جم |
| app/maternity/baby-development.tsx | 171 | الثلث الثاني |
| app/maternity/baby-development.tsx | 172 | تتكون الأكياس الهوائية في الرئتين، وتبدأ البشرة بالامتلاء التدريجي بالدهون. |
| app/maternity/baby-development.tsx | 173 | تكون أكياس الرئة الهوائية وبداية إفراز مادة السورفاكتانت |
| app/maternity/baby-development.tsx | 173 | امتلاء البشرة والجلد بالدهون ليصبح أقل تجعداً |
| app/maternity/baby-development.tsx | 174 | قومي بعمل فحص تحمل الجلوكوز لتشخيص سكر الحمل في هذا الوقت. |
| app/maternity/baby-development.tsx | 174 | استمري في تناول الفيتامينات. |
| app/maternity/baby-development.tsx | 177 | حبة قرنبيط |
| app/maternity/baby-development.tsx | 177 | 34.6 سم |
| app/maternity/baby-development.tsx | 177 | 660 جم |
| app/maternity/baby-development.tsx | 177 | الثلث الثاني |
| app/maternity/baby-development.tsx | 178 | يستجيب الجنين لصوت الأم بشكل مميز، وتمتلئ الأطراف بالدهون تدريجياً. |
| app/maternity/baby-development.tsx | 179 | الاستجابة الحركية والقلبية المباشرة لصوت الأم والوالد |
| app/maternity/baby-development.tsx | 179 | تطور بنية المخ والاتصالات العصبية المعقدة |
| app/maternity/baby-development.tsx | 180 | تجنبي النوم تماماً على الظهر، واعتمدي الجانب الأيسر. |
| app/maternity/baby-development.tsx | 180 | احرصي على وجبات تحتوي على الكالسيوم. |
| app/maternity/baby-development.tsx | 183 | حبة خس |
| app/maternity/baby-development.tsx | 183 | 35.6 سم |
| app/maternity/baby-development.tsx | 183 | 760 جم |
| app/maternity/baby-development.tsx | 183 | الثلث الثاني |
| app/maternity/baby-development.tsx | 184 | تبدأ العينان بالانفتاح التدريجي، وتستعد الرئتان لعملية التنفس الأولى. |
| app/maternity/baby-development.tsx | 185 | انفتاح جفون العينين وتطور الجهاز العصبي البصري |
| app/maternity/baby-development.tsx | 185 | استنشاق الجنين للسائل الأمنيوسي لتمرين الرئتين |
| app/maternity/baby-development.tsx | 186 | مارسي تمارين التمدد الخفيفة للتخلص من آلام أسفل الظهر. |
| app/maternity/baby-development.tsx | 186 | تجنبي المجهود الشديد. |
| app/maternity/baby-development.tsx | 189 | حبة باذنجان |
| app/maternity/baby-development.tsx | 189 | 36.6 سم |
| app/maternity/baby-development.tsx | 189 | 875 جم |
| app/maternity/baby-development.tsx | 189 | الثلث الثاني |
| app/maternity/baby-development.tsx | 190 | نهاية الثلث الثاني، ينتظم نشاط الدماغ وتتطور دورات النوم بوضوح كبير. |
| app/maternity/baby-development.tsx | 191 | انتظام نشاط الموجات الدماغية وتطور النوم العميق |
| app/maternity/baby-development.tsx | 191 | اكتمال نمو الهيكل البصري وقدرته على الرمش |
| app/maternity/baby-development.tsx | 192 | ابدئي بتجهيز حقيبة الولادة والتسوق لمستلزمات الرضيع. |
| app/maternity/baby-development.tsx | 192 | احرصي على المتابعة الدورية. |
| app/maternity/baby-development.tsx | 195 | حبة قرنبيط كبيرة |
| app/maternity/baby-development.tsx | 195 | 37.6 سم |
| app/maternity/baby-development.tsx | 195 | 1.0 كجم |
| app/maternity/baby-development.tsx | 195 | الثلث الثالث |
| app/maternity/baby-development.tsx | 196 | بداية الثلث الثالث، يفتح عينيه ويغمضهما ويرى الضوء المتسرب عبر جدار البطن. |
| app/maternity/baby-development.tsx | 197 | تطور القدرة على الإبصار وتمييز الضوء المتسرب |
| app/maternity/baby-development.tsx | 197 | بدء إنتاج خلايا الدم الحمراء بالكامل في نخاع العظام |
| app/maternity/baby-development.tsx | 198 | تابعي حركة الجنين يومياً (يجب ألا تقل عن 10 حركات في ساعتين). |
| app/maternity/baby-development.tsx | 198 | تجنبي الوجبات الحارة لمنع الحموضة. |
| app/maternity/baby-development.tsx | 201 | حبة كرنب |
| app/maternity/baby-development.tsx | 201 | 38.6 سم |
| app/maternity/baby-development.tsx | 201 | 1.2 كجم |
| app/maternity/baby-development.tsx | 201 | الثلث الثالث |
| app/maternity/baby-development.tsx | 202 | تقوى العضلات وتكتمل الرئتان تدريجياً، ويحتاج الجنين للمزيد من الكالسيوم. |
| app/maternity/baby-development.tsx | 203 | تطور القوة العضلية وركلات قوية تشعر بها الأم بوضوح |
| app/maternity/baby-development.tsx | 203 | تراكم الكالسيوم بكثافة في عظام الجنين لبنائها |
| app/maternity/baby-development.tsx | 204 | تناولي الحليب والأجبان بكثرة لدعم عظام الجنين. |
| app/maternity/baby-development.tsx | 204 | احرصي على تمارين التنفس والاسترخاء. |
| app/maternity/baby-development.tsx | 207 | حبة كوسة كبيرة جداً |
| app/maternity/baby-development.tsx | 207 | 39.9 سم |
| app/maternity/baby-development.tsx | 207 | 1.3 كجم |
| app/maternity/baby-development.tsx | 207 | الثلث الثالث |
| app/maternity/baby-development.tsx | 208 | ينمو الدماغ بسرعة وتتشكل تلافيفه، ويبدأ زغب الشعر بالاختفاء من الجسم. |
| app/maternity/baby-development.tsx | 209 | تطور تلافيف الدماغ وزيادة سرعة النبضات العصبية |
| app/maternity/baby-development.tsx | 209 | تساقط زغب الشعر الجنيني الناعم وبقاء طلاء الفيرنكس |
| app/maternity/baby-development.tsx | 210 | تجنبي حمل الأشياء الثقيلة لحماية أسفل ظهرك وحوضك. |
| app/maternity/baby-development.tsx | 210 | جهزي رقم الطبيب والطوارئ في مكان بارز. |
| app/maternity/baby-development.tsx | 213 | حبة أناناس |
| app/maternity/baby-development.tsx | 213 | 41.1 سم |
| app/maternity/baby-development.tsx | 213 | 1.5 كجم |
| app/maternity/baby-development.tsx | 213 | الثلث الثالث |
| app/maternity/baby-development.tsx | 214 | تكتمل الحواس الخمس تماماً، ويستطيع تتبع الضوء وتدوير الرأس بالداخل. |
| app/maternity/baby-development.tsx | 215 | اكتمال عمل الحواس الخمس وإرسال الإشارات للدماغ |
| app/maternity/baby-development.tsx | 215 | توجيه الرأس وتدويره نحو مصادر الضوء القريبة |
| app/maternity/baby-development.tsx | 216 | قللي من تناول الموالح والمخللات لتجنب احتباس السوائل. |
| app/maternity/baby-development.tsx | 216 | ارفعي قدميك كلما أتيحت الفرصة. |
| app/maternity/baby-development.tsx | 219 | حبة قرع شتوي |
| app/maternity/baby-development.tsx | 219 | 42.4 سم |
| app/maternity/baby-development.tsx | 219 | 1.7 كجم |
| app/maternity/baby-development.tsx | 219 | الثلث الثالث |
| app/maternity/baby-development.tsx | 220 | يتدرب الجنين على التنفس ببلع وطرد السائل، ويتخذ وضعية الرأس للأسفل. |
| app/maternity/baby-development.tsx | 221 | اتخاذ الجنين لوضعية الرأس للأسفل (Cephalic) استعداداً للولادة |
| app/maternity/baby-development.tsx | 221 | تصلب معظم العظام باستثناء عظام الجمجمة المرنة |
| app/maternity/baby-development.tsx | 222 | اجعلي زيارات المتابعة الطبية كل أسبوعين من الآن فصاعداً. |
| app/maternity/baby-development.tsx | 222 | احرصي على المشي الخفيف اليومي. |
| app/maternity/baby-development.tsx | 225 | حبة كرفس |
| app/maternity/baby-development.tsx | 225 | 43.7 سم |
| app/maternity/baby-development.tsx | 225 | 1.9 كجم |
| app/maternity/baby-development.tsx | 225 | الثلث الثالث |
| app/maternity/baby-development.tsx | 226 | تقوى عظام الجمجمة مع بقائها مرنة لتسهيل الولادة عبر القناة المهبلية. |
| app/maternity/baby-development.tsx | 227 | بقاء عظام الجمجمة غير ملتحمة لتتداخل أثناء المخاض |
| app/maternity/baby-development.tsx | 227 | تطور الجهاز المناعي الذاتي عبر نقل الأجسام المضادة للأم |
| app/maternity/baby-development.tsx | 228 | تجنبي الجلوس الطويل دون حركة لتفادي جلطات الساق وتورم القدمين. |
| app/maternity/baby-development.tsx | 228 | اشربي الكثير من الماء. |
| app/maternity/baby-development.tsx | 231 | حبة جوز هند |
| app/maternity/baby-development.tsx | 231 | 45 سم |
| app/maternity/baby-development.tsx | 231 | 2.1 كجم |
| app/maternity/baby-development.tsx | 231 | الثلث الثالث |
| app/maternity/baby-development.tsx | 232 | يكتمل نمو الجهاز العصبي المركزي وتستقر الرئتان بشكل شبه كامل ومستقر. |
| app/maternity/baby-development.tsx | 233 | نضوج الرئتين الكامل وقدرتهما على التنفس الذاتي |
| app/maternity/baby-development.tsx | 233 | تطور الجهاز العصبي المركزي وتنسيق حركات التنفس والبلع |
| app/maternity/baby-development.tsx | 234 | تأكدي من تجهيز حقيبة المستشفى وأغراض الرضيع بالكامل. |
| app/maternity/baby-development.tsx | 234 | احصلي على قسط وافر من الراحة والنوم. |
| app/maternity/baby-development.tsx | 237 | حبة شمام |
| app/maternity/baby-development.tsx | 237 | 46.2 سم |
| app/maternity/baby-development.tsx | 237 | 2.4 كجم |
| app/maternity/baby-development.tsx | 237 | الثلث الثالث |
| app/maternity/baby-development.tsx | 238 | يكتسب الجنين وزناً سريعاً وتصبح أطرافه ممتلئة وبشرته وردية وناعمة. |
| app/maternity/baby-development.tsx | 239 | تراكم الدهون تحت الجلد ليصبح ناعماً ووردياً بالكامل |
| app/maternity/baby-development.tsx | 239 | نمو أظافر اليدين لتغطي أطراف الأصابع بالكامل |
| app/maternity/baby-development.tsx | 240 | تعرفي على أعراض الطلق الفعلي والفرق بينه وبين الطلق الكاذب. |
| app/maternity/baby-development.tsx | 240 | تابعي حركة الجنين بدقة. |
| app/maternity/baby-development.tsx | 243 | حبة خس روماني |
| app/maternity/baby-development.tsx | 243 | 47.4 - 48 سم |
| app/maternity/baby-development.tsx | 243 | 2.6 كجم |
| app/maternity/baby-development.tsx | 243 | الثلث الثالث |
| app/maternity/baby-development.tsx | 244 | ينزل الجنين إلى الحوض، ويقل معدل حركاته القوية بسبب ضيق المساحة. |
| app/maternity/baby-development.tsx | 245 | نزول رأس الجنين في تجويف الحوض (Engagement) |
| app/maternity/baby-development.tsx | 245 | اكتمال نمو كافة أجهزة الجسم واستقرار الوزن |
| app/maternity/baby-development.tsx | 246 | احرصي على مراجعة الطبيبة أسبوعياً لمتابعة نبض الجنين وعنق الرحم. |
| app/maternity/baby-development.tsx | 246 | تجنبي المجهود الزائد. |
| app/maternity/baby-development.tsx | 249 | حبة سلق سويسري |
| app/maternity/baby-development.tsx | 249 | 48.6 سم |
| app/maternity/baby-development.tsx | 249 | 2.9 كجم |
| app/maternity/baby-development.tsx | 249 | الثلث الثالث |
| app/maternity/baby-development.tsx | 250 | يعتبر الحمل مكتملاً سريرياً، والرئتان جاهزتان للتنفس خارج الرحم تماماً. |
| app/maternity/baby-development.tsx | 251 | اكتمال الحمل سريرياً (Full Term Baby) |
| app/maternity/baby-development.tsx | 251 | جاهزية الرئتين والجهاز الهضمي للعمل المستقل خارج الرحم |
| app/maternity/baby-development.tsx | 252 | المشي اليومي الخفيف يساعد على فتح الحوض وتسهيل الولادة. |
| app/maternity/baby-development.tsx | 252 | تناولي التمر لفوائده لعضلات الرحم. |
| app/maternity/baby-development.tsx | 255 | حبة قرع كبير |
| app/maternity/baby-development.tsx | 255 | 49.8 سم |
| app/maternity/baby-development.tsx | 255 | 3.1 كجم |
| app/maternity/baby-development.tsx | 255 | الثلث الثالث |
| app/maternity/baby-development.tsx | 256 | يتساقط معظم الشعر الناعم والطلاء الدهني، ويستمر الكبد والكلية بالعمل بانتظام. |
| app/maternity/baby-development.tsx | 257 | تساقط كافة الشعر الناعم والطلاء الدهني في السائل الأمنيوسي |
| app/maternity/baby-development.tsx | 257 | تكون قبضة يد قوية جداً للجنين وتطور منعكس المص |
| app/maternity/baby-development.tsx | 258 | استرخي وخذي حماماً دافئاً لتخفيف آلام الظهر وتشنجات الحوض. |
| app/maternity/baby-development.tsx | 258 | حافظي على ترطيب بشرتك. |
| app/maternity/baby-development.tsx | 261 | حبة بطيخ صغير |
| app/maternity/baby-development.tsx | 261 | 50.7 سم |
| app/maternity/baby-development.tsx | 261 | 3.3 كجم |
| app/maternity/baby-development.tsx | 261 | الثلث الثالث |
| app/maternity/baby-development.tsx | 262 | يكتمل نمو الجنين تماماً، ويصبح قادراً على قبض يده بقوة استعداداً للمخاض والولادة. |
| app/maternity/baby-development.tsx | 263 | اكتمال بناء الأجهزة واستقرار الوزن النهائي للجنين |
| app/maternity/baby-development.tsx | 263 | تراكم الأجسام المضادة للأم لضمان مناعة قوية للرضيع |
| app/maternity/baby-development.tsx | 264 | كوني على تواصل مستمر مع طبيبتك ومستشفى الولادة. |
| app/maternity/baby-development.tsx | 264 | راقبي نزول أي سوائل أو إفرازات غريبة. |
| app/maternity/baby-development.tsx | 267 | حبة يقطين كبيرة |
| app/maternity/baby-development.tsx | 267 | 51.2 سم |
| app/maternity/baby-development.tsx | 267 | 3.5 كجم |
| app/maternity/baby-development.tsx | 267 | الثلث الثالث |
| app/maternity/baby-development.tsx | 268 | موعد الولادة المتوقع! الجنين بكامل نموه وجاهز لبدء حياته في العالم الخارجي. |
| app/maternity/baby-development.tsx | 269 | جاهزية الجنين الكاملة للخروج والولادة الطبيعية |
| app/maternity/baby-development.tsx | 269 | بلوغ الوزن والطول المتوسط المثالي لحديثي الولادة |
| app/maternity/baby-development.tsx | 270 | تمنياتنا لك بولادة ميسرة وطفل سليم! استرخي وامشي بانتظام. |
| app/maternity/baby-development.tsx | 270 | اتبعي كافة إرشادات فريقك الطبي بالمستشفى. |
| app/maternity/baby-development.tsx | 463 | إغلاق 3D |
| app/maternity/baby-development.tsx | 463 | مجسم 3D |
| app/maternity/baby-growth.tsx | 302 | مثال: 6 |
| app/maternity/baby-growth.tsx | 313 | مثال: 7.5 |
| app/maternity/baby-growth.tsx | 324 | مثال: 65 |
| app/maternity/baby-growth.tsx | 335 | مثال: 42 |
| app/maternity/baby-growth.tsx | 346 | جاري الحفظ... |
| app/maternity/baby-growth.tsx | 346 | حفظ القياس |
| app/maternity/hub.tsx | 43 | ملاحظة طبية |
| app/maternity/hub.tsx | 45 | أنت تتصفح كزائر. يرجى تسجيل الدخول لحفظ بيانات حملك ومتابعة حالتك بدقة. |
| app/maternity/hub.tsx | 46 | شاشات رعاية الأمومة والتبويض مصممة للإناث لمتابعة الدورة الشهرية وتخطيط الحمل والولادة. يمكنك تصفح الشاشة والاطلاع على الميزات بشكل طبيعي. |
| app/maternity/hub.tsx | 239 | الثلث الأول |
| app/maternity/hub.tsx | 239 | الثلث الثاني |
| app/maternity/hub.tsx | 239 | الثلث الثالث |
| app/maternity/hub.tsx | 346 | دورة منتظمة |
| app/maternity/hub.tsx | 346 | دورة غير منتظمة |
| app/maternity/hub.tsx | 404 | الوزن المقدر |
| app/maternity/hub.tsx | 404 | 1.0 كجم |
| app/maternity/hub.tsx | 405 | الطول المقدر |
| app/maternity/hub.tsx | 405 | 37.6 سم |
| app/maternity/hub.tsx | 406 | الأسبوع الحالي |
| app/maternity/hub.tsx | 406 | ${ar(week)}/٤٠ |
| app/maternity/hub.tsx | 433 | ${week} أسبوع |
| app/maternity/maternity-setup.tsx | 34 | يناير |
| app/maternity/maternity-setup.tsx | 34 | فبراير |
| app/maternity/maternity-setup.tsx | 34 | مارس |
| app/maternity/maternity-setup.tsx | 34 | أبريل |
| app/maternity/maternity-setup.tsx | 34 | مايو |
| app/maternity/maternity-setup.tsx | 34 | يونيو |
| app/maternity/maternity-setup.tsx | 35 | يوليو |
| app/maternity/maternity-setup.tsx | 35 | أغسطس |
| app/maternity/maternity-setup.tsx | 35 | سبتمبر |
| app/maternity/maternity-setup.tsx | 35 | أكتوبر |
| app/maternity/maternity-setup.tsx | 35 | نوفمبر |
| app/maternity/maternity-setup.tsx | 35 | ديسمبر |
| app/maternity/maternity-setup.tsx | 117 | الرجاء اختيار المسار الخاص بكِ |
| app/maternity/maternity-setup.tsx | 122 | الرجاء اختيار طريقة حساب موعد الولادة |
| app/maternity/maternity-setup.tsx | 130 | الرجاء تحديد تاريخ آخر دورة شهرية |
| app/maternity/maternity-setup.tsx | 138 | الرجاء تحديد تاريخ آخر دورة شهرية |
| app/maternity/maternity-setup.tsx | 142 | الرجاء تحديد موعد الولادة المتوقع |
| app/maternity/maternity-setup.tsx | 241 | أهلاً بكِ في مساحة الأمومة! ما هي مرحلتك الحالية؟ |
| app/maternity/maternity-setup.tsx | 242 | كيف تفضلين حساب موعد ولادتك؟ |
| app/maternity/maternity-setup.tsx | 243 | متى هو موعد ولادتك المتوقع؟ |
| app/maternity/maternity-setup.tsx | 244 | متى كان أول يوم في آخر دورة شهرية (LMP)؟ |
| app/maternity/maternity-setup.tsx | 245 | متى كان أول يوم في آخر دورة شهرية؟ |
| app/maternity/maternity-setup.tsx | 246 | كم متوسط طول دورتكِ الشهرية؟ |
| app/maternity/maternity-setup.tsx | 405 | جاري الحفظ... |
| app/maternity/maternity-setup.tsx | 405 | ابدئي التجربة |
| app/maternity/maternity-setup.tsx | 405 | التالي |
| app/maternity/ovulation-tracker.tsx | 34 | يناير |
| app/maternity/ovulation-tracker.tsx | 34 | فبراير |
| app/maternity/ovulation-tracker.tsx | 34 | مارس |
| app/maternity/ovulation-tracker.tsx | 34 | أبريل |
| app/maternity/ovulation-tracker.tsx | 34 | مايو |
| app/maternity/ovulation-tracker.tsx | 34 | يونيو |
| app/maternity/ovulation-tracker.tsx | 35 | يوليو |
| app/maternity/ovulation-tracker.tsx | 35 | أغسطس |
| app/maternity/ovulation-tracker.tsx | 35 | سبتمبر |
| app/maternity/ovulation-tracker.tsx | 35 | أكتوبر |
| app/maternity/ovulation-tracker.tsx | 35 | نوفمبر |
| app/maternity/ovulation-tracker.tsx | 35 | ديسمبر |
| app/maternity/ovulation-tracker.tsx | 145 | الرجاء اختيار تاريخ آخر دورة شهرية |
| app/maternity/ovulation-tracker.tsx | 149 | الرجاء تحديد ما إذا كانت دورتك منتظمة |
| app/maternity/ovulation-tracker.tsx | 373 | متى كان أول يوم في آخر دورة شهرية؟ |
| app/maternity/ovulation-tracker.tsx | 374 | هل دورتكِ الشهرية منتظمة عادةً؟ |
| app/maternity/ovulation-tracker.tsx | 375 | كم متوسط طول دورتكِ الشهرية؟ |
| app/maternity/ovulation-tracker.tsx | 376 | متى كان أول يوم في الدورة التي قبل الأخيرة؟ (اختياري) |
| app/maternity/ovulation-tracker.tsx | 463 | احسب التبويض |
| app/maternity/ovulation-tracker.tsx | 479 | احسب التبويض |
| app/maternity/ovulation-tracker.tsx | 479 | التالي |
| app/maternity/pregnancy-tracker.tsx | 189 | الثلث ${trimester === 1 ? 'الأول' : trimester === 2 ? 'الثاني' : 'الثالث'} |
| app/maternity/pregnancy-tracker.tsx | 202 | حساب ركلات الجنين |
| app/maternity/pregnancy-tracker.tsx | 226 | حفظ الجلسة |
| app/maternity/pregnancy-tracker.tsx | 247 | مؤقت الانقباضات (الطلق) |
| app/maternity/pregnancy-tracker.tsx | 256 | إيقاف الانقباض |
| app/maternity/pregnancy-tracker.tsx | 256 | بدء الانقباض |
| app/maternity/pregnancy-tracker.tsx | 278 | الفحوصات القادمة |
| app/maternity/pregnancy-tracker.tsx | 289 | تم |
| app/maternity/pregnancy-tracker.tsx | 295 | استشارة طبيب نساء وولادة |
| app/maternity/pregnancy-tracker.tsx | 296 | خطة تغذية للحامل |
| app/mental-health/breathing.tsx | 14 | للاسترخاء العميق |
| app/mental-health/breathing.tsx | 15 | التنفس الصندوقي |
| app/mental-health/breathing.tsx | 15 | للتركيز وتهدئة الأعصاب |
| app/mental-health/breathing.tsx | 16 | للهدوء السريع |
| app/mental-health/breathing.tsx | 30 | استنشق |
| app/mental-health/breathing.tsx | 31 | احبس |
| app/mental-health/breathing.tsx | 32 | أخرج الهواء |
| app/mental-health/breathing.tsx | 33 | احبس |
| app/mental-health/breathing.tsx | 150 | أعد التمرين |
| app/mental-health/breathing.tsx | 150 | ▶️ ابدأ — ${technique.cycles} دورات |
| app/mental-health/breathing.tsx | 161 | — ${technique.hold}s احباس |
| app/mental-health/breathing.tsx | 161 | } — {technique.exhale}s إخراج </AppText> </View> </View> ); } const styles = StyleSheet.create({ container: { flex: 1 }, header: { flexDirection: |
| app/mental-health/crisis-support.tsx | 16 | تمارين التنفس |
| app/mental-health/crisis-support.tsx | 16 | أسرع تقنية لتهدئة الذعر الآن |
| app/mental-health/crisis-support.tsx | 17 | التأمل الآني |
| app/mental-health/crisis-support.tsx | 17 | جلسة 5 دقائق للهدوء الفوري |
| app/mental-health/crisis-support.tsx | 18 | كتابة المشاعر |
| app/mental-health/crisis-support.tsx | 18 | أخرج ما بداخلك قبل كل شيء |
| app/mental-health/crisis-support.tsx | 22 | إذا كنت في خطر مباشر، اتصل بـ 998 أو 997 فوراً |
| app/mental-health/crisis-support.tsx | 23 | أخبر شخصاً تثق به بما تشعر به |
| app/mental-health/crisis-support.tsx | 24 | ابتعد عن أي أدوات أو مواد قد تسبب أذى |
| app/mental-health/crisis-support.tsx | 25 | اذهب لمكان آمن ومضاء |
| app/mental-health/crisis-support.tsx | 26 | لا تكن وحدك — الدعم متاح الآن |
| app/mental-health/crisis-support.tsx | 116 | جهة اتصال |
| app/mental-health/hub.tsx | 21 | مطابقة المعالج بالـ AI |
| app/mental-health/hub.tsx | 22 | نساعدك في إيجاد المعالج المثالي |
| app/mental-health/hub.tsx | 28 | تمارين التنفس |
| app/mental-health/hub.tsx | 29 | تقنيات تنفس للهدوء والاسترخاء |
| app/mental-health/hub.tsx | 35 | تأمل موجّه |
| app/mental-health/hub.tsx | 36 | جلسات تأمل صوتية |
| app/mental-health/hub.tsx | 42 | سجل المزاج |
| app/mental-health/hub.tsx | 43 | تتبع مشاعرك يومياً |
| app/mental-health/hub.tsx | 49 | تقييم ذاتي |
| app/mental-health/hub.tsx | 50 | اختبارات نفسية معتمدة |
| app/mental-health/hub.tsx | 56 | دعم الأزمات |
| app/mental-health/hub.tsx | 57 | خطوط مساعدة فورية 24/7 |
| app/mental-health/hub.tsx | 63 | استشارة نفسية |
| app/mental-health/hub.tsx | 64 | تحدث مع طبيب نفسي معتمد |
| app/mental-health/meditation.tsx | 19 | اجلس في وضع مريح وأغمض عينيك |
| app/mental-health/meditation.tsx | 20 | ضع يديك على فخذيك بارتياح |
| app/mental-health/meditation.tsx | 21 | ركّز على أنفاسك... استنشق ببطء |
| app/mental-health/meditation.tsx | 22 | احبس الهواء للحظة... ثم أخرجه |
| app/mental-health/meditation.tsx | 23 | اترك أفكارك تمرّ كالسحاب... |
| app/mental-health/meditation.tsx | 24 | اشعر بالهدوء يملأ جسدك وعقلك |
| app/mental-health/meditation.tsx | 176 | جلسة هذا الشهر |
| app/mental-health/meditation.tsx | 176 | وقت التأمل |
| app/mental-health/meditation.tsx | 176 | يوم متتالٍ |
| app/mental-health/meditation.tsx | 193 | مبتدئ |
| app/mental-health/meditation.tsx | 193 | متوسط |
| app/mental-health/mood-journal.tsx | 136 | اكتب ما يخطر على بالك... |
| app/mental-health/mood-journal.tsx | 146 | تم الحفظ! |
| app/mental-health/mood-journal.tsx | 146 | حفظ السجل اليومي |
| app/mental-health/self-assessment.tsx | 37 | ممتاز |
| app/mental-health/self-assessment.tsx | 86 | طبيب |
| app/mental-health/self-assessment.tsx | 88 | طبيب |
| app/mental-health/self-assessment.tsx | 88 | احجز الآن |
| app/mental-health/self-assessment.tsx | 88 | ابدأ الآن |
| app/mental-health/self-assessment.tsx | 136 | جاري الحفظ... |
| app/mental-health/self-assessment.tsx | 136 | عرض النتيجة ← |
| app/mental-health/therapist-match.tsx | 12 | قلق وتوتر |
| app/mental-health/therapist-match.tsx | 12 | اكتئاب |
| app/mental-health/therapist-match.tsx | 12 | مشاكل نوم |
| app/mental-health/therapist-match.tsx | 12 | ضغوط العمل |
| app/mental-health/therapist-match.tsx | 12 | مشاكل عائلية |
| app/mental-health/therapist-match.tsx | 12 | إدمان |
| app/mental-health/therapist-match.tsx | 12 | صدمة نفسية |
| app/mental-health/therapist-match.tsx | 12 | ثقة بالنفس |
| app/mental-health/therapist-match.tsx | 12 | اضطرابات أكل |
| app/mental-health/therapist-match.tsx | 12 | حزن وفقدان |
| app/mental-health/therapist-match.tsx | 41 | العربية |
| app/mental-health/therapist-match.tsx | 41 | العربية |
| app/mental-health/therapist-match.tsx | 71 | ما الذي يشغلك؟ (اختر كل ما ينطبق) |
| app/mental-health/therapist-match.tsx | 83 | ابحث عن معالج مناسب |
| app/mental-health/therapist-match.tsx | 119 | احجز الآن |
| app/notifications/index.tsx | 26 | موعدك بعد ساعة |
| app/notifications/index.tsx | 26 | د. محمد أحمد — استشارة فيديو 2:00 م |
| app/notifications/index.tsx | 26 | منذ 30 دقيقة |
| app/notifications/index.tsx | 27 | وقت جرعة ميتفورمين |
| app/notifications/index.tsx | 27 | 1 حبة — 500mg — بعد الأكل |
| app/notifications/index.tsx | 27 | منذ ساعة |
| app/notifications/index.tsx | 28 | طلب صلاحيات عائلية جديد |
| app/notifications/index.tsx | 28 | أحمد محمد يطلب الوصول لبياناتك الصحية — اضغط للقبول أو الرفض |
| app/notifications/index.tsx | 28 | منذ 5 دقائق |
| app/notifications/index.tsx | 29 | تم تعديل صلاحياتك |
| app/notifications/index.tsx | 29 | سارة أحمد عدّلت صلاحيات الوصول لبياناتك العائلية |
| app/notifications/index.tsx | 29 | منذ ساعة |
| app/notifications/index.tsx | 30 | خصم 25% على الاستشارات |
| app/notifications/index.tsx | 30 | استخدم كود: NABDAH25 — ينتهي غداً |
| app/notifications/index.tsx | 30 | أمس |
| app/notifications/index.tsx | 31 | نتائج تحاليلك جاهزة |
| app/notifications/index.tsx | 31 | تحاليل دم شاملة — مختبرات البرج |
| app/notifications/index.tsx | 31 | منذ 3 ساعات |
| app/notifications/index.tsx | 32 | تنبيه: أوشك مخزون دوائك على النفاد |
| app/notifications/index.tsx | 32 | منظم السكر Metformin متبقي 5 أيام. اضغط لإعادة الصرف الفوري. |
| app/notifications/index.tsx | 32 | منذ ساعتين |
| app/notifications/index.tsx | 33 | عرض استرجاع كاشباك جديد |
| app/notifications/index.tsx | 33 | احصل على 10% كاشباك فوري عند الحجز باستخدام المحفظة هذا الأسبوع. |
| app/notifications/index.tsx | 33 | أمس |
| app/notifications/index.tsx | 37 | نظامي |
| app/notifications/index.tsx | 38 | طبي |
| app/notifications/index.tsx | 39 | عروض |
| app/nursing/live-doctor-tracking.tsx | 34 | في الطريق إليك |
| app/nursing/live-doctor-tracking.tsx | 34 | قريب جداً — استعد! |
| app/nursing/live-doctor-tracking.tsx | 34 | وصل إلى موقعك! |
| app/nursing/live-doctor-tracking.tsx | 97 | الوقت المتوقع |
| app/nursing/live-doctor-tracking.tsx | 97 | وصل |
| app/nursing/live-doctor-tracking.tsx | 97 | ${eta} دقيقة |
| app/nursing/live-doctor-tracking.tsx | 98 | المسافة |
| app/nursing/live-doctor-tracking.tsx | 98 | ${(eta * 0.3).toFixed(1)} كم |
| app/nursing/live-doctor-tracking.tsx | 99 | موعد الزيارة |
| app/nursing/live-doctor-tracking.tsx | 99 | 3:00 م |
| app/nursing/live-tracking.tsx | 90 | تعذر تحميل التتبع الحي للزيارة. |
| app/nursing/live-tracking.tsx | 114 | غير مسجل |
| app/nursing/live-tracking.tsx | 118 | غير مسجل |
| app/nursing/live-tracking.tsx | 122 | لا توجد ملاحظات مسجلة. |
| app/nursing/live-tracking.tsx | 140 | تم استلام موقع الزيارة. يتطلب العرض الجغرافي مزود خرائط مهيأ. |
| app/nursing/live-tracking.tsx | 140 | لم يستلم النظام موقعاً حياً لهذه الزيارة بعد. |
| app/nursing/live-tracking.tsx | 162 | تتبع الممرض |
| app/nursing/live-tracking.tsx | 162 | التوجه للمستشفى |
| app/nursing/live-tracking.tsx | 175 | غير متاح |
| app/nursing/live-tracking.tsx | 175 | دقيقة |
| app/nursing/live-tracking.tsx | 180 | الممرض في الطريق إليك |
| app/nursing/live-tracking.tsx | 181 | يرجى التوجه لإحضار الممرض |
| app/nursing/live-tracking.tsx | 185 | مقدم الخدمة: ${trackingData?.nurse_name ?? 'غير متاح'}. |
| app/nursing/live-tracking.tsx | 186 | الوجهة: ${trackingData?.facility_name ?? 'غير متاحة'}. |
| app/nursing/live-tracking.tsx | 209 | مقدم الخدمة غير متاح |
| app/nursing/live-tracking.tsx | 210 | لا توجد بيانات مهنية مؤكدة |
| app/nursing/nurse-profile.tsx | 207 | زيارة واحدة فقط |
| app/nursing/nurse-profile.tsx | 207 | كل يوم لمدة (${daysCount} أيام) |
| app/nursing/nurse-profile.tsx | 247 | نقدي |
| app/nursing/nurse-profile.tsx | 247 | تأمين |
| app/nursing/nurse-profile.tsx | 290 | إرسال لطلب موافقة التأمين |
| app/nursing/nurse-profile.tsx | 290 | دفع ${finalTotal} ر.س (Visa/Apple Pay) |
| app/nursing/nurse-profile.tsx | 314 | زيارة واحدة فقط |
| app/nursing/nurse-profile.tsx | 314 | ${day} أيام متتالية |
| app/nursing/service-details.tsx | 53 | الأقرب أولاً |
| app/nursing/service-details.tsx | 53 | الأعلى تقييماً |
| app/nursing/service-details.tsx | 53 | الكل |
| app/nursing/service-details.tsx | 113 | مستشفى خاص |
| app/nursing/service-details.tsx | 134 | حقن |
| app/nursing/service-details.tsx | 134 | وريد |
| app/nutrition/ai-meal-planner.tsx | 20 | خسارة وزن |
| app/nutrition/ai-meal-planner.tsx | 21 | الحفاظ على الوزن |
| app/nutrition/ai-meal-planner.tsx | 22 | زيادة كتلة عضلية |
| app/nutrition/ai-meal-planner.tsx | 23 | التحكم بالسكري |
| app/nutrition/ai-meal-planner.tsx | 24 | صحة القلب |
| app/nutrition/ai-meal-planner.tsx | 25 | رفع الطاقة |
| app/nutrition/ai-meal-planner.tsx | 36 | السبت |
| app/nutrition/ai-meal-planner.tsx | 58 | عادي |
| app/nutrition/ai-meal-planner.tsx | 143 | السبت |
| app/nutrition/ai-meal-planner.tsx | 143 | الاثنين |
| app/nutrition/ai-meal-planner.tsx | 143 | الثلاثاء |
| app/nutrition/ai-meal-planner.tsx | 143 | الأربعاء |
| app/nutrition/ai-meal-planner.tsx | 143 | الخميس |
| app/nutrition/ai-meal-planner.tsx | 143 | الجمعة |
| app/nutrition/ai-meal-planner.tsx | 211 | العمر |
| app/nutrition/ai-meal-planner.tsx | 211 | 34 سنة |
| app/nutrition/ai-meal-planner.tsx | 212 | الطول |
| app/nutrition/ai-meal-planner.tsx | 212 | 186 سم |
| app/nutrition/ai-meal-planner.tsx | 213 | الوزن |
| app/nutrition/ai-meal-planner.tsx | 213 | 78 كجم |
| app/nutrition/ai-meal-planner.tsx | 214 | 22.4 طبيعي |
| app/nutrition/ai-meal-planner.tsx | 215 | نشاط |
| app/nutrition/ai-meal-planner.tsx | 215 | متوسط |
| app/nutrition/ai-meal-planner.tsx | 216 | حساسية |
| app/nutrition/ai-meal-planner.tsx | 216 | بنسلين |
| app/nutrition/ai-plan-builder.tsx | 14 | إنقاص وزن |
| app/nutrition/ai-plan-builder.tsx | 14 | خطة حمية متوازنة لخسارة الوزن بشكل صحي |
| app/nutrition/ai-plan-builder.tsx | 15 | زيادة وزن |
| app/nutrition/ai-plan-builder.tsx | 15 | نظام غني بالبروتين والسعرات لبناء الكتلة العضلية |
| app/nutrition/ai-plan-builder.tsx | 16 | نمط صحي |
| app/nutrition/ai-plan-builder.tsx | 16 | نظام متوازن للحفاظ على صحتك ونشاطك |
| app/nutrition/ai-plan-builder.tsx | 17 | بناء عضلات |
| app/nutrition/ai-plan-builder.tsx | 17 | تغذية مركزة على البروتين مع نظام تمرين |
| app/nutrition/ai-plan-builder.tsx | 20 | عادي |
| app/nutrition/ai-plan-builder.tsx | 20 | نباتي |
| app/nutrition/ai-plan-builder.tsx | 20 | كيتو |
| app/nutrition/ai-plan-builder.tsx | 20 | منخفض الكربوهيدرات |
| app/nutrition/ai-plan-builder.tsx | 20 | خالي من الجلوتين |
| app/nutrition/ai-plan-builder.tsx | 20 | حلال فقط |
| app/nutrition/ai-plan-builder.tsx | 71 | خطأ |
| app/nutrition/ai-plan-builder.tsx | 71 | فشل إنشاء الخطة الغذائية. يرجى المحاولة لاحقاً. |
| app/nutrition/ai-plan-builder.tsx | 95 | اختر هدفك |
| app/nutrition/ai-plan-builder.tsx | 111 | بيانات الجسم |
| app/nutrition/ai-plan-builder.tsx | 112 | ذكر |
| app/nutrition/ai-plan-builder.tsx | 112 | أنثى |
| app/nutrition/ai-plan-builder.tsx | 114 | الوزن (كغ) |
| app/nutrition/ai-plan-builder.tsx | 115 | الطول (سم) |
| app/nutrition/ai-plan-builder.tsx | 118 | العمر |
| app/nutrition/ai-plan-builder.tsx | 119 | الوزن المستهدف |
| app/nutrition/ai-plan-builder.tsx | 122 | مستوى النشاط |
| app/nutrition/ai-plan-builder.tsx | 124 | منخفض |
| app/nutrition/ai-plan-builder.tsx | 124 | متوسط |
| app/nutrition/ai-plan-builder.tsx | 124 | عالي |
| app/nutrition/ai-plan-builder.tsx | 127 | التالي |
| app/nutrition/ai-plan-builder.tsx | 134 | تفضيلات غذائية |
| app/nutrition/ai-plan-builder.tsx | 143 | حساسية أو أطعمة ممنوعة (اختياري) |
| app/nutrition/ai-plan-builder.tsx | 145 | إنشاء الخطة بالـ AI |
| app/nutrition/ai-plan-builder.tsx | 161 | الهدف اليومي |
| app/nutrition/ai-plan-builder.tsx | 164 | سعرات |
| app/nutrition/ai-plan-builder.tsx | 165 | بروتين |
| app/nutrition/ai-plan-builder.tsx | 166 | كربوهيدرات |
| app/nutrition/ai-plan-builder.tsx | 167 | دهون |
| app/nutrition/ai-plan-builder.tsx | 194 | حفظ الخطة |
| app/nutrition/ai-plan-builder.tsx | 195 | إنشاء خطة تمارين مناسبة |
| app/nutrition/body-composition.tsx | 32 | وزن الجسم |
| app/nutrition/body-composition.tsx | 34 | كغ |
| app/nutrition/body-composition.tsx | 39 | نسبة الدهون |
| app/nutrition/body-composition.tsx | 46 | كتلة العضلات |
| app/nutrition/body-composition.tsx | 48 | كغ |
| app/nutrition/body-composition.tsx | 53 | الماء |
| app/nutrition/body-composition.tsx | 60 | معدل الأيض |
| app/nutrition/body-composition.tsx | 147 | تحديد هدف جديد |
| app/nutrition/body-composition.tsx | 153 | إنشاء خطة مخصصة |
| app/nutrition/body-target.tsx | 24 | نحيف |
| app/nutrition/body-target.tsx | 24 | طبيعي |
| app/nutrition/body-target.tsx | 24 | زيادة وزن |
| app/nutrition/body-target.tsx | 24 | سمنة |
| app/nutrition/body-target.tsx | 50 | تم الحفظ |
| app/nutrition/body-target.tsx | 50 | تم تحديث بياناتك الجسمانية بنجاح |
| app/nutrition/body-target.tsx | 52 | خطأ |
| app/nutrition/body-target.tsx | 52 | تعذر حفظ البيانات |
| app/nutrition/body-target.tsx | 68 | ذكر |
| app/nutrition/body-target.tsx | 68 | أنثى |
| app/nutrition/body-target.tsx | 71 | الوزن (كغ) |
| app/nutrition/body-target.tsx | 72 | الطول (سم) |
| app/nutrition/body-target.tsx | 81 | جاري التحميل |
| app/nutrition/body-target.tsx | 83 | نحيف |
| app/nutrition/body-target.tsx | 83 | طبيعي |
| app/nutrition/body-target.tsx | 83 | زيادة |
| app/nutrition/body-target.tsx | 83 | سمنة |
| app/nutrition/body-target.tsx | 91 | الوزن المستهدف |
| app/nutrition/body-target.tsx | 92 | الوزن المستهدف (كغ) |
| app/nutrition/body-target.tsx | 97 | خسارة |
| app/nutrition/body-target.tsx | 97 | اكتساب |
| app/nutrition/body-target.tsx | 103 | جاري الحفظ... |
| app/nutrition/body-target.tsx | 103 | حفظ بياناتي |
| app/nutrition/body-target.tsx | 104 | إنشاء خطة غذائية |
| app/nutrition/body-target.tsx | 105 | عرض هيكل الجسم |
| app/nutrition/calorie-analyzer.tsx | 44 | خطأ |
| app/nutrition/calorie-analyzer.tsx | 44 | فشل تحليل الوجبة. يرجى المحاولة لاحقاً. |
| app/nutrition/calorie-analyzer.tsx | 53 | كبسة لحم مع سلطة وزبادي |
| app/nutrition/calorie-analyzer.tsx | 110 | مثال: كبسة لحم مع سلطة وزبادي... |
| app/nutrition/calorie-analyzer.tsx | 118 | تحليل بالنص |
| app/nutrition/calorie-analyzer.tsx | 127 | صوّر الأكل |
| app/nutrition/calorie-analyzer.tsx | 162 | القيم الغذائية |
| app/nutrition/calorie-analyzer.tsx | 165 | سعرات |
| app/nutrition/calorie-analyzer.tsx | 166 | بروتين |
| app/nutrition/calorie-analyzer.tsx | 167 | كربوهيدرات |
| app/nutrition/calorie-analyzer.tsx | 168 | دهون |
| app/nutrition/calorie-analyzer.tsx | 169 | ألياف |
| app/nutrition/calorie-analyzer.tsx | 186 | الفيتامينات والمعادن |
| app/nutrition/calorie-analyzer.tsx | 202 | نصائح AI |
| app/nutrition/calorie-analyzer.tsx | 225 | إضافة للسجل اليومي |
| app/nutrition/daily-tracker.tsx | 51 | خطأ |
| app/nutrition/daily-tracker.tsx | 51 | تعذر تسجيل الماء |
| app/nutrition/daily-tracker.tsx | 62 | الفطور |
| app/nutrition/daily-tracker.tsx | 62 | الغداء |
| app/nutrition/daily-tracker.tsx | 62 | العشاء |
| app/nutrition/daily-tracker.tsx | 88 | وصلت هدفك! |
| app/nutrition/daily-tracker.tsx | 88 | باقي ${targetCal - totalCal} سعرة |
| app/nutrition/daily-tracker.tsx | 94 | الوجبات |
| app/nutrition/daily-tracker.tsx | 121 | الماء |
| app/nutrition/daily-tracker.tsx | 137 | كوب (250) |
| app/nutrition/daily-tracker.tsx | 137 | قنينة (500) |
| app/nutrition/daily-tracker.tsx | 154 | ${summary.total_exercise_minutes} دقيقة اليوم |
| app/nutrition/daily-tracker.tsx | 154 | لم تسجّل تمرين اليوم |
| app/nutrition/daily-tracker.tsx | 160 | تحليل وجبة بالـ AI |
| app/nutrition/exercise-plan.tsx | 12 | السبت |
| app/nutrition/exercise-plan.tsx | 12 | صدر + ترايسبس |
| app/nutrition/exercise-plan.tsx | 12 | بنش بريس × 4 |
| app/nutrition/exercise-plan.tsx | 12 | ضغط مائل × 3 |
| app/nutrition/exercise-plan.tsx | 12 | تفتيح × 3 |
| app/nutrition/exercise-plan.tsx | 12 | تراي كيبل × 3 |
| app/nutrition/exercise-plan.tsx | 13 | الأحد |
| app/nutrition/exercise-plan.tsx | 13 | ظهر + باي |
| app/nutrition/exercise-plan.tsx | 13 | سحب علوي × 4 |
| app/nutrition/exercise-plan.tsx | 13 | تجديف × 3 |
| app/nutrition/exercise-plan.tsx | 13 | سحب أرضي × 3 |
| app/nutrition/exercise-plan.tsx | 13 | باي كيرل × 3 |
| app/nutrition/exercise-plan.tsx | 14 | الإثنين |
| app/nutrition/exercise-plan.tsx | 14 | راحة / كارديو خفيف |
| app/nutrition/exercise-plan.tsx | 14 | مشي 30 دقيقة |
| app/nutrition/exercise-plan.tsx | 14 | تمدد 15 دقيقة |
| app/nutrition/exercise-plan.tsx | 15 | الثلاثاء |
| app/nutrition/exercise-plan.tsx | 15 | أكتاف + بطن |
| app/nutrition/exercise-plan.tsx | 15 | ضغط أمامي × 4 |
| app/nutrition/exercise-plan.tsx | 15 | رفع جانبي × 3 |
| app/nutrition/exercise-plan.tsx | 15 | رفع أمامي × 3 |
| app/nutrition/exercise-plan.tsx | 15 | بلانك × 3 |
| app/nutrition/exercise-plan.tsx | 16 | الأربعاء |
| app/nutrition/exercise-plan.tsx | 16 | أرجل |
| app/nutrition/exercise-plan.tsx | 16 | سكوات × 4 |
| app/nutrition/exercise-plan.tsx | 16 | لانجز × 3 |
| app/nutrition/exercise-plan.tsx | 16 | ضغط أرجل × 3 |
| app/nutrition/exercise-plan.tsx | 16 | بطة × 3 |
| app/nutrition/exercise-plan.tsx | 35 | الجيم |
| app/nutrition/exercise-plan.tsx | 36 | البيت |
| app/nutrition/exercise-plan.tsx | 37 | خارجي |
| app/nutrition/exercise-plan.tsx | 54 | ${day.duration} دقيقة |
| app/nutrition/exercise-plan.tsx | 65 | تعديل الخطة بالـ AI |
| app/nutrition/food-scanner.tsx | 14 | صدر دجاج مشوي |
| app/nutrition/food-scanner.tsx | 15 | 100 جم |
| app/nutrition/food-scanner.tsx | 24 | صحي جداً |
| app/nutrition/food-scanner.tsx | 26 | مصدر ممتاز للبروتين، مناسب لكل الأهداف الغذائية |
| app/nutrition/food-scanner.tsx | 43 | صدر دجاج مشوي مع أرز وسلطة |
| app/nutrition/food-scanner.tsx | 46 | صدر دجاج مشوي |
| app/nutrition/food-scanner.tsx | 47 | 150 جم |
| app/nutrition/food-scanner.tsx | 56 | صحي جداً |
| app/nutrition/food-scanner.tsx | 56 | ️ تناول باعتدال |
| app/nutrition/food-scanner.tsx | 58 | وجبة مغذية غنية بالبروتينات والعناصر الهامة. |
| app/nutrition/food-scanner.tsx | 127 | سعرة |
| app/nutrition/food-scanner.tsx | 128 | بروتين |
| app/nutrition/food-scanner.tsx | 128 | ${scanResult.protein * qty}جم |
| app/nutrition/food-scanner.tsx | 129 | كارب |
| app/nutrition/food-scanner.tsx | 129 | ${scanResult.carbs * qty}جم |
| app/nutrition/food-scanner.tsx | 130 | دهون |
| app/nutrition/food-scanner.tsx | 130 | ${scanResult.fat * qty}جم |
| app/nutrition/food-scanner.tsx | 142 | جاري الإضافة... |
| app/nutrition/food-scanner.tsx | 142 | + أضف للوجبة (${scanResult.calories * qty} سعرة) |
| app/nutrition/hub.tsx | 27 | خطة غذائية بالـ AI |
| app/nutrition/hub.tsx | 28 | تخسيس · زيادة · نمط صحي · بناء عضلات |
| app/nutrition/hub.tsx | 34 | تحليل السعرات |
| app/nutrition/hub.tsx | 35 | صوّر أكلك أو اكتبه — AI يحلل القيم الغذائية |
| app/nutrition/hub.tsx | 41 | هدف الجسم |
| app/nutrition/hub.tsx | 42 | BMI + نسبة دهون + وزن مستهدف |
| app/nutrition/hub.tsx | 48 | خطة تمارين |
| app/nutrition/hub.tsx | 49 | تمارين بيت أو جيم مخصصة بالـ AI |
| app/nutrition/hub.tsx | 55 | التتبع اليومي |
| app/nutrition/hub.tsx | 56 | وجبات + ماء + رياضة |
| app/nutrition/hub.tsx | 62 | تكوين الجسم |
| app/nutrition/hub.tsx | 63 | عرض هيكل الجسم ومؤشراتك |
| app/nutrition/hub.tsx | 69 | تخطيط الوجبات |
| app/nutrition/hub.tsx | 70 | خطط وجبات أسبوعية ذكية |
| app/nutrition/hub.tsx | 76 | ماسح الطعام |
| app/nutrition/hub.tsx | 77 | صوّر الطعام واعرف مكوناته |
| app/nutrition/hub.tsx | 83 | تسجيل وجبة |
| app/nutrition/hub.tsx | 84 | سجّل وجبتك يدوياً |
| app/nutrition/hub.tsx | 90 | تتبع الماء |
| app/nutrition/hub.tsx | 91 | تأكد من شربك كفاية |
| app/nutrition/hub.tsx | 97 | استشارة أخصائي تغذية |
| app/nutrition/hub.tsx | 98 | تحدث مع أخصائي معتمد |
| app/nutrition/log-meal.tsx | 14 | الإفطار |
| app/nutrition/log-meal.tsx | 14 | 8:00 ص |
| app/nutrition/log-meal.tsx | 15 | الغداء |
| app/nutrition/log-meal.tsx | 15 | 1:00 م |
| app/nutrition/log-meal.tsx | 16 | العشاء |
| app/nutrition/log-meal.tsx | 16 | 7:00 م |
| app/nutrition/log-meal.tsx | 17 | وجبة خفيفة |
| app/nutrition/log-meal.tsx | 17 | أي وقت |
| app/nutrition/log-meal.tsx | 65 | خطأ |
| app/nutrition/log-meal.tsx | 65 | تعذر حفظ الوجبة. تأكد من اتصالك بالإنترنت. |
| app/nutrition/log-meal.tsx | 139 | ابحث عن طعام... |
| app/nutrition/log-meal.tsx | 163 | جاري الحفظ... |
| app/nutrition/log-meal.tsx | 163 | حفظ الوجبة (${totalCal} سعرة) |
| app/nutrition/water-tracker.tsx | 14 | كوب صغير |
| app/nutrition/water-tracker.tsx | 53 | خطأ |
| app/nutrition/water-tracker.tsx | 53 | تعذر تسجيل الماء. تأكد من اتصالك بالإنترنت. |
| app/nutrition/water-tracker.tsx | 149 | ابدأ يومك بكوب ماء فور الاستيقاظ |
| app/nutrition/water-tracker.tsx | 149 | اشرب كوباً قبل كل وجبة |
| app/nutrition/water-tracker.tsx | 149 | احمل قنينة ماء معك دائماً |
| app/offers/[id].tsx | 41 | تفقد هذا العرض الرائع من تطبيق نبض بلس: ${offer.title} بسعر ${offer.discountedPrice} ريال فقط في ${offer.provider}! |
| app/offers/[id].tsx | 51 | تأكيد الحجز |
| app/offers/[id].tsx | 52 | هل ترغب في حجز "${offer.title}" مع "${offer.provider}" بسعر ${offer.discountedPrice} ريال؟ |
| app/offers/[id].tsx | 54 | إلغاء |
| app/offers/[id].tsx | 56 | احجز الآن |
| app/offers/[id].tsx | 62 | العرض متوفر |
| app/offers/[id].tsx | 112 | ممول |
| app/offers/[id].tsx | 130 | وفر ${offer.originalPrice - offer.discountedPrice} ر.س |
| app/offers/[id].tsx | 146 | مشتملات الباقة |
| app/offers/[id].tsx | 176 | الشروط والأحكام |
| app/offers/[id].tsx | 190 | احجز العرض الآن |
| app/payments/failed.tsx | 25 | • رصيد غير كافٍ في البطاقة |
| app/payments/failed.tsx | 26 | • تأكد من صحة بيانات البطاقة |
| app/payments/failed.tsx | 27 | • حاول مرة أخرى أو استخدم طريقة دفع مختلفة |
| app/payments/failure.tsx | 63 | إعادة المحاولة |
| app/payments/failure.tsx | 69 | تغيير طريقة الدفع |
| app/payments/failure.tsx | 75 | العودة للرئيسية |
| app/payments/processing.tsx | 38 | جاري معالجة الدفع... |
| app/payments/processing.tsx | 127 | انتهت مهلة التحقق |
| app/payments/processing.tsx | 136 | جاري التحقق من حالة الدفع... |
| app/payments/processing.tsx | 137 | جاري التحقق... (${attempt}/${MAX_ATTEMPTS}) |
| app/payments/processing.tsx | 194 | تعذر التحقق من حالة الدفع |
| app/payments/processing.tsx | 336 | يمكنك التحقق يدوياً من حالة الدفع |
| app/payments/processing.tsx | 337 | لا تغلق هذه الشاشة |
| app/payments/processing.tsx | 377 | تحقق من حالة الدفع |
| app/payments/processing.tsx | 384 | إلغاء العملية |
| app/payments/success.tsx | 28 | الخدمة |
| app/payments/success.tsx | 49 | رقم المرجع |
| app/payments/success.tsx | 50 | التاريخ والوقت |
| app/payments/success.tsx | 51 | طريقة الدفع |
| app/payments/success.tsx | 51 | فيزا •••• 4521 |
| app/payments/success.tsx | 52 | الحالة |
| app/payments/success.tsx | 52 | ناجح |
| app/payments/success.tsx | 74 | عرض موقع العيادة |
| app/payments/success.tsx | 74 | تتبع الطبيب |
| app/payments/success.tsx | 74 | غرفة الانتظار |
| app/pharmacy/barcode-scanner.tsx | 29 | لم يتم العثور على دواء موثق لهذا الباركود. |
| app/pharmacy/barcode-scanner.tsx | 54 | السماح بالكاميرا |
| app/pharmacy/barcode-scanner.tsx | 91 | دواء موثق |
| app/pharmacy/barcode-scanner.tsx | 92 | يتطلب وصفة |
| app/pharmacy/barcode-scanner.tsx | 94 | السعر غير متاح |
| app/pharmacy/barcode-scanner.tsx | 94 | ${result.price} ر.س |
| app/pharmacy/barcode-scanner.tsx | 101 | عرض التفاصيل وإضافة للسلة |
| app/pharmacy/barcode-scanner.tsx | 102 | مسح دواء آخر |
| app/pharmacy/barcode-scanner.tsx | 108 | تعذر التحقق من الباركود. |
| app/pharmacy/barcode-scanner.tsx | 109 | المسح مرة أخرى |
| app/pharmacy/broadcast-status.tsx | 99 | بث الطلب للصيدليات |
| app/pharmacy/broadcast-status.tsx | 99 | اختر أفضل عرض |
| app/pharmacy/broadcast-status.tsx | 102 | ${responses.length} صيدلية ردّت حتى الآن |
| app/pharmacy/broadcast-status.tsx | 102 | ${responses.length} عروض متاحة |
| app/pharmacy/broadcast-status.tsx | 135 | الردود الواردة حتى الآن: |
| app/pharmacy/broadcast-status.tsx | 135 | اختر الأنسب لك: |
| app/pharmacy/broadcast-status.tsx | 185 | وفّر ${Math.round(150 * ph.discount / 100)} ر |
| app/pharmacy/broadcast-status.tsx | 185 | لا يوجد |
| app/pharmacy/cart.tsx | 33 | إذن مطلوب |
| app/pharmacy/cart.tsx | 33 | نحتاج إذن الوصول للمعرض لرفع صورة الروشتة |
| app/pharmacy/cart.tsx | 49 | إذن مطلوب |
| app/pharmacy/cart.tsx | 49 | نحتاج إذن الكاميرا لتصوير الروشتة |
| app/pharmacy/cart.tsx | 89 | تفريغ السلة |
| app/pharmacy/cart.tsx | 89 | هل تريد إزالة كل الأصناف؟ |
| app/pharmacy/cart.tsx | 89 | إلغاء |
| app/pharmacy/cart.tsx | 89 | تفريغ |
| app/pharmacy/cart.tsx | 150 | تم إرفاق الوصفة الطبية |
| app/pharmacy/cart.tsx | 150 | مطلوب وصفة طبية (Rx) |
| app/pharmacy/cart.tsx | 153 | سيراجعها الصيدلي قبل تأكيد طلبك. |
| app/pharmacy/cart.tsx | 153 | بعض أدويتك تستلزم روشتة طبية. يرجى رفعها للمتابعة. |
| app/pharmacy/cart.tsx | 221 | ارفع الوصفة أولاً للمتابعة |
| app/pharmacy/cart.tsx | 221 | متابعة لإتمام الطلب |
| app/pharmacy/chat-with-pharmacist.tsx | 25 | صيدلي أحمد العتيبي |
| app/pharmacy/chat-with-pharmacist.tsx | 26 | صيدلية الدواء |
| app/pharmacy/chat-with-pharmacist.tsx | 27 | متصل |
| app/pharmacy/chat-with-pharmacist.tsx | 61 | انتهت جلسة المحادثة. شكراً لتواصلك مع صيدلية الدواء. |
| app/pharmacy/chat-with-pharmacist.tsx | 63 | الآن |
| app/pharmacy/chat-with-pharmacist.tsx | 89 | الآن |
| app/pharmacy/chat-with-pharmacist.tsx | 154 | قبول البدائل |
| app/pharmacy/chat-with-pharmacist.tsx | 154 | تم إرسال طلب قبول الأدوية البديلة المقترحة بنجاح. |
| app/pharmacy/chat-with-pharmacist.tsx | 164 | حذف الأدوية غير المتوفرة |
| app/pharmacy/chat-with-pharmacist.tsx | 164 | تم تحديث سلة الشراء وحذف الأصناف غير المتوفرة. |
| app/pharmacy/chat-with-pharmacist.tsx | 174 | إلغاء الطلب |
| app/pharmacy/chat-with-pharmacist.tsx | 174 | تم إلغاء الطلب الحالي. |
| app/pharmacy/chat-with-pharmacist.tsx | 252 | غير متصل |
| app/pharmacy/chat-with-pharmacist.tsx | 288 | العودة للصيدلية |
| app/pharmacy/chat-with-pharmacist.tsx | 302 | اكتب رسالتك للصيدلي... |
| app/pharmacy/checkout.tsx | 58 | التأمين غير مضاف |
| app/pharmacy/checkout.tsx | 59 | لم تقم بإضافة بطاقة التأمين الطبي الخاصة بك. يرجى إضافتها من الملف الشخصي ليتسنى لنا تغطية الطلب. |
| app/pharmacy/checkout.tsx | 61 | إلغاء |
| app/pharmacy/checkout.tsx | 62 | إضافة تأمين |
| app/pharmacy/checkout.tsx | 85 | السلة فارغة |
| app/pharmacy/checkout.tsx | 85 | أضف الأصناف المطلوبة قبل إرسال الطلب. |
| app/pharmacy/checkout.tsx | 89 | عنوان التوصيل مطلوب |
| app/pharmacy/checkout.tsx | 89 | اختر عنواناً محفوظاً يتضمن الموقع قبل إرسال الطلب. |
| app/pharmacy/checkout.tsx | 142 | توصيل للمنزل |
| app/pharmacy/checkout.tsx | 142 | تحدد الرسوم في العرض |
| app/pharmacy/checkout.tsx | 143 | استلام من الصيدلية |
| app/pharmacy/checkout.tsx | 143 | مجاناً |
| app/pharmacy/checkout.tsx | 171 | عنوان التوصيل |
| app/pharmacy/checkout.tsx | 173 | جاري التحميل... |
| app/pharmacy/checkout.tsx | 173 | ${userAddress.street \|\| ''}، ${userAddress.city \|\| ''} |
| app/pharmacy/checkout.tsx | 186 | بطاقة ائتمانية / مدى |
| app/pharmacy/checkout.tsx | 187 | التأمين الطبي |
| app/pharmacy/checkout.tsx | 187 | التعاونية · بوبا · ميدغلف |
| app/pharmacy/custom-item.tsx | 45 | color={colors.textPrimary}> تم إرسال الطلب! </AppText> <AppText variant= |
| app/pharmacy/custom-item.tsx | 48 | > سنتواصل معك خلال ساعة لتأكيد التوفر والسعر </AppText> <TouchableOpacity onPress={() => router.replace( |
| app/pharmacy/custom-item.tsx | 119 | اسم الدواء * |
| app/pharmacy/custom-item.tsx | 122 | مثال: ميتفورمين 500mg |
| app/pharmacy/custom-item.tsx | 125 | الجرعة / التركيز |
| app/pharmacy/custom-item.tsx | 128 | مثال: 500mg |
| app/pharmacy/custom-item.tsx | 131 | الكمية |
| app/pharmacy/custom-item.tsx | 134 | مثال: 2 علبة |
| app/pharmacy/custom-item.tsx | 204 | أي معلومات إضافية... |
| app/pharmacy/custom-item.tsx | 233 | تم رفع الوصفة |
| app/pharmacy/custom-item.tsx | 234 | رفع الوصفة الطبية (اختياري) |
| app/pharmacy/drug-not-found.tsx | 35 | ️ نقص في توريد الدواء |
| app/pharmacy/drug-not-found.tsx | 36 | توضح البيانات الطبية وجود نقص عام في دواء "${name}". هل تود الاستمرار لنبحث لك عن بديل مكافئ علمياً؟ |
| app/pharmacy/drug-not-found.tsx | 38 | إلغاء |
| app/pharmacy/drug-not-found.tsx | 39 | نعم، ابحث عن بديل |
| app/pharmacy/drug-not-found.tsx | 61 | العودة للصيدلية |
| app/pharmacy/drug-not-found.tsx | 62 | إضافة دواء آخر |
| app/pharmacy/drug-not-found.tsx | 89 | بيانات الدواء |
| app/pharmacy/drug-not-found.tsx | 91 | اسم الدواء * |
| app/pharmacy/drug-not-found.tsx | 92 | التركيز / الجرعة (مثال: 500mg) |
| app/pharmacy/drug-not-found.tsx | 94 | الكمية |
| app/pharmacy/drug-not-found.tsx | 97 | ملاحظات إضافية (اختياري) |
| app/pharmacy/drug-not-found.tsx | 103 | صورة الدواء أو العلبة (اختياري) |
| app/pharmacy/drug-not-found.tsx | 113 | تم رفع الصورة |
| app/pharmacy/drug-not-found.tsx | 123 | ماذا سيحدث؟ |
| app/pharmacy/drug-not-found.tsx | 125 | سيستلم الصيدلي طلبك ويتحقق من الدواء |
| app/pharmacy/drug-not-found.tsx | 126 | سيبحث عن الدواء أو البديل المناسب |
| app/pharmacy/drug-not-found.tsx | 127 | ستصلك إشعار بالنتيجة والسعر |
| app/pharmacy/drug-not-found.tsx | 128 | تؤكد الطلب ونوصّله لك |
| app/pharmacy/drug-not-found.tsx | 141 | إرسال للصيدلية |
| app/pharmacy/filters.tsx | 17 | الكل |
| app/pharmacy/filters.tsx | 18 | مسكنات |
| app/pharmacy/filters.tsx | 19 | فيتامينات ومكملات |
| app/pharmacy/filters.tsx | 20 | مضادات حيوية |
| app/pharmacy/filters.tsx | 24 | أقراص / كبسول |
| app/pharmacy/filters.tsx | 25 | شراب |
| app/pharmacy/filters.tsx | 26 | حقن |
| app/pharmacy/filters.tsx | 27 | كريم / مرهم |
| app/pharmacy/filters.tsx | 31 | الأكثر صلة |
| app/pharmacy/filters.tsx | 32 | السعر: من الأقل للأعلى |
| app/pharmacy/filters.tsx | 33 | السعر: من الأعلى للأقل |
| app/pharmacy/filters.tsx | 34 | الأحدث إضافةً |
| app/pharmacy/filters.tsx | 67 | عناية بالبشرة |
| app/pharmacy/filters.tsx | 68 | أدوية ومسكنات |
| app/pharmacy/filters.tsx | 69 | فيتامينات |
| app/pharmacy/filters.tsx | 70 | عناية بالطفل |
| app/pharmacy/filters.tsx | 71 | أجهزة طبية |
| app/pharmacy/filters.tsx | 72 | عناية شخصية |
| app/pharmacy/filters.tsx | 80 | الكل |
| app/pharmacy/filters.tsx | 151 | , color: colors.n }}>تصفية النتائج</Text> {activeCount > 0 && ( <View style={[st.countBadge, { backgroundColor: p } ]}> <Text style={{ fontSize: 11, color: |
| app/pharmacy/filters.tsx | 154 | }}>{activeCount} فلتر نشط</Text> </View> )} </View> <TouchableOpacity onPress={handleReset}> <Text style={{ fontSize: 13, fontFamily: |
| app/pharmacy/filters.tsx | 170 | ترتيب حسب |
| app/pharmacy/filters.tsx | 193 | التصنيف |
| app/pharmacy/filters.tsx | 244 | نطاق السعر (ر.س) |
| app/pharmacy/filters.tsx | 248 | الحد الأدنى |
| app/pharmacy/filters.tsx | 258 | الحد الأقصى |
| app/pharmacy/filters.tsx | 270 | الشكل الدوائي |
| app/pharmacy/filters.tsx | 293 | الشركة المصنعة |
| app/pharmacy/filters.tsx | 297 | ابحث عن شركة... |
| app/pharmacy/manual-order.tsx | 78 | مثال: كونجستال أقراص |
| app/pharmacy/manual-order.tsx | 87 | أضف أي تفاصيل أخرى تساعد الصيدلي... |
| app/pharmacy/medicine-compare.tsx | 14 | المادة الفعالة |
| app/pharmacy/medicine-compare.tsx | 15 | التركيز |
| app/pharmacy/medicine-compare.tsx | 16 | الشكل |
| app/pharmacy/medicine-compare.tsx | 17 | الكمية |
| app/pharmacy/medicine-compare.tsx | 17 | حبة |
| app/pharmacy/medicine-compare.tsx | 18 | السعر |
| app/pharmacy/medicine-compare.tsx | 18 | ريال |
| app/pharmacy/medicine-compare.tsx | 19 | التقييم |
| app/pharmacy/medicine-compare.tsx | 20 | يحتاج وصفة |
| app/pharmacy/medicine-compare.tsx | 21 | الآثار الجانبية |
| app/pharmacy/medicine-compare.tsx | 89 | غير متوفر |
| app/pharmacy/medicine-compare.tsx | 92 | نعم |
| app/pharmacy/medicine-compare.tsx | 92 | لا |
| app/pharmacy/order-confirm.tsx | 36 | معرف الطلب مفقود |
| app/pharmacy/order-confirm.tsx | 41 | تعذر تحميل تفاصيل الطلب. لا يمكن عرض أو اعتماد بيانات غير مؤكدة. |
| app/pharmacy/order-confirm.tsx | 55 | تعذر اعتماد الطلب. لم يتم الانتقال إلى الدفع. |
| app/pharmacy/order-confirm.tsx | 67 | تعذر رفض العرض. لم يتغير الطلب. |
| app/pharmacy/order-confirm.tsx | 83 | تعذر تحميل تفاصيل الطلب. |
| app/pharmacy/order-confirm.tsx | 122 | كل الأصناف متوفرة |
| app/pharmacy/order-confirm.tsx | 122 | متوفر جزئياً |
| app/pharmacy/order-history.tsx | 44 | تم التوصيل |
| app/pharmacy/order-history.tsx | 45 | ملغي |
| app/pharmacy/order-history.tsx | 46 | قيد التنفيذ |
| app/pharmacy/order-history.tsx | 147 | الكل |
| app/pharmacy/order-history.tsx | 148 | مكتمل |
| app/pharmacy/order-history.tsx | 149 | ملغي |
| app/pharmacy/order-tracking.tsx | 65 | لا توجد حالة تتبع صالحة لهذا الطلب |
| app/pharmacy/order-tracking.tsx | 72 | تعذر تحميل تتبع الطلب. لا يمكن عرض بيانات تقديرية. |
| app/pharmacy/order-tracking.tsx | 82 | غير متاح |
| app/pharmacy/order-tracking.tsx | 83 | غير متاح |
| app/pharmacy/order-tracking.tsx | 89 | تعذر تحميل تتبع الطلب. |
| app/pharmacy/order-tracking.tsx | 187 | رقم الطلب |
| app/pharmacy/order-tracking.tsx | 188 | طريقة الاستلام |
| app/pharmacy/order-tracking.tsx | 188 | توصيل للمنزل |
| app/pharmacy/order-tracking.tsx | 189 | الإجمالي المدفوع |
| app/pharmacy/order-tracking.tsx | 189 | ${total.toFixed(2)} ر.س |
| app/pharmacy/order-tracking.tsx | 224 | تعذر تحميل الصفحة |
| app/pharmacy/payment.tsx | 60 | الدفع غير متاح |
| app/pharmacy/payment.tsx | 60 | انتظر اعتماد عرض الصيدلية والسعر النهائي قبل الدفع. |
| app/pharmacy/payment.tsx | 76 | تعذر بدء الدفع |
| app/pharmacy/payment.tsx | 76 | لم يتم تأكيد أي عملية دفع. تحقق من الاتصال وحالة الطلب ثم أعد المحاولة. |
| app/pharmacy/payment.tsx | 101 | المبلغ المستحق وفق العرض المعتمد |
| app/pharmacy/payment.tsx | 101 | بانتظار العرض المعتمد |
| app/pharmacy/pharmacist-chat.tsx | 74 | الآن |
| app/pharmacy/pharmacist-chat.tsx | 342 | اكتب رسالتك للصيدلي... |
| app/pharmacy/product-detail.tsx | 124 | مطلوب وصفة طبية |
| app/pharmacy/product-detail.tsx | 125 | هذا الدواء يتطلب إرفاق روشتة طبية سارية. سيُطلب منك رفعها في سلة المشتريات لإتمام الطلب. |
| app/pharmacy/product-detail.tsx | 126 | موافق |
| app/pharmacy/product-detail.tsx | 154 | المنتج غير موجود |
| app/pharmacy/product-detail.tsx | 166 | ${name} \| ${med.active_ingredient \|\| ''} \| صيدلية نبض |
| app/pharmacy/product-detail.tsx | 243 | وصفة طبية |
| app/pharmacy/product-detail.tsx | 251 | النوع |
| app/pharmacy/product-detail.tsx | 252 | التركيز |
| app/pharmacy/product-detail.tsx | 253 | المادة الفعالة |
| app/pharmacy/product-detail.tsx | 260 | بدائل مقترحة (نفس المادة الفعالة) |
| app/pharmacy/product-detail.tsx | 282 | الوصف والتفاصيل |
| app/pharmacy/product-detail.tsx | 283 | الجرعة وطريقة الاستخدام |
| app/pharmacy/product-detail.tsx | 284 | الأعراض الجانبية |
| app/pharmacy/product-detail.tsx | 285 | تحذيرات وموانع الاستخدام |
| app/pharmacy/product-detail.tsx | 311 | أضف إلى السلة |
| app/pharmacy/reorder.tsx | 85 | إلغاء الكل |
| app/pharmacy/reorder.tsx | 85 | تحديد الكل |
| app/pharmacy/reorder.tsx | 123 | إضافة أصناف جديدة |
| app/pharmacy/reorder.tsx | 127 | طريقة الاستلام |
| app/pharmacy/reorder.tsx | 129 | توصيل |
| app/pharmacy/reorder.tsx | 130 | استلام من الصيدلية |
| app/pharmacy/reorder.tsx | 133 | عنوان التوصيل |
| app/pharmacy/reorder.tsx | 139 | طريقة الدفع |
| app/pharmacy/reorder.tsx | 141 | بطاقة |
| app/pharmacy/reorder.tsx | 142 | المحفظة |
| app/pharmacy/reorder.tsx | 143 | عند الاستلام |
| app/pharmacy/reorder.tsx | 158 | تأكيد إعادة الطلب |
| app/pharmacy/rx-order.tsx | 89 | الأدوية الموصوفة |
| app/pharmacy/rx-order.tsx | 100 | يحتاج وصفة |
| app/pharmacy/rx-order.tsx | 114 | المستندات المطلوبة للتأمين |
| app/pharmacy/rx-order.tsx | 121 | تم إرفاق الوصفة |
| app/pharmacy/rx-order.tsx | 121 | رفع صورة الوصفة |
| app/pharmacy/rx-order.tsx | 130 | تم إرفاق الموافقة |
| app/pharmacy/rx-order.tsx | 130 | رفع موافقة مسبقة (اختياري) |
| app/pharmacy/rx-order.tsx | 141 | ليس لديك وصفة؟ استشر طبيب |
| app/pharmacy/rx-order.tsx | 151 | طريقة الاستلام |
| app/pharmacy/rx-order.tsx | 153 | توصيل |
| app/pharmacy/rx-order.tsx | 154 | استلام |
| app/pharmacy/rx-order.tsx | 175 | طريقة الدفع |
| app/pharmacy/rx-order.tsx | 177 | تأمين |
| app/pharmacy/rx-order.tsx | 178 | بطاقة |
| app/pharmacy/rx-order.tsx | 179 | عند الاستلام |
| app/pharmacy/rx-order.tsx | 185 | بيانات التأمين |
| app/pharmacy/rx-order.tsx | 207 | ملخص التكلفة |
| app/pharmacy/rx-order.tsx | 221 | التحقق من التأمين وطلب الأدوية |
| app/pharmacy/rx-order.tsx | 221 | تأكيد ودفع ${total} ر.س |
| app/pharmacy/scan-prescription.tsx | 49 | عذراً |
| app/pharmacy/scan-prescription.tsx | 49 | نحتاج صلاحية المعرض لاختيار صورة الوصفة. |
| app/pharmacy/scan-prescription.tsx | 93 | دواء |
| app/pharmacy/scan-prescription.tsx | 110 | حدث خطأ أثناء تحليل الروشتة. يرجى المحاولة مرة أخرى. |
| app/pharmacy/waiting-for-pharmacy.tsx | 122 | إلغاء الطلب |
| app/pharmacy/waiting-for-pharmacy.tsx | 122 | هل أنت متأكد من رغبتك في إلغاء الطلب؟ |
| app/pharmacy/waiting-for-pharmacy.tsx | 123 | لا، تراجع |
| app/pharmacy/waiting-for-pharmacy.tsx | 125 | نعم، إلغاء |
| app/pharmacy/waiting-for-pharmacy.tsx | 212 | صيدليات موثقة |
| app/pharmacy/waiting-for-pharmacy.tsx | 213 | يقبل تأمينك |
| app/pharmacy/waiting-for-pharmacy.tsx | 214 | الأقرب إليك |
| app/pharmacy/wishlist.tsx | 132 | متوفر |
| app/pharmacy/wishlist.tsx | 132 | غير متوفر |
| app/profile/addresses.tsx | 145 | إضافة عنوان جديد |
| app/profile/index.tsx | 15 | صحتي |
| app/profile/index.tsx | 16 | أدويتي |
| app/profile/index.tsx | 17 | وصفاتي |
| app/profile/index.tsx | 18 | تقاريري |
| app/profile/index.tsx | 19 | مواعيدي |
| app/profile/index.tsx | 20 | طلباتي |
| app/profile/index.tsx | 21 | محفظتي |
| app/profile/index.tsx | 22 | التأمين الطبي |
| app/profile/index.tsx | 23 | عناويني |
| app/profile/index.tsx | 24 | عائلتي |
| app/profile/index.tsx | 25 | النقاط |
| app/profile/index.tsx | 26 | الإعدادات |
| app/profile/index.tsx | 48 | مرحباً بك، زائر |
| app/profile/index.tsx | 48 | أحمد محمد العتيبي |
| app/profile/index.tsx | 62 | تسجيل الدخول / إنشاء حساب |
| app/profile/index.tsx | 95 | تسجيل الخروج |
| app/profile/insurance.tsx | 98 | شركة التأمين |
| app/profile/insurance.tsx | 133 | تحديث الوثيقة |
| app/profile/insurance.tsx | 154 | إضافة بطاقة تأمين |
| app/profile/insurance.tsx | 160 | التعاونية للتأمين |
| app/programs/active.tsx | 15 | برنامج إدارة السكري المكثف |
| app/programs/active.tsx | 16 | 6 أشهر |
| app/programs/active.tsx | 19 | غير محدد |
| app/programs/active.tsx | 20 | 09:00 ص |
| app/programs/active.tsx | 21 | الاستشارة التأسيسية لغدد الصماء |
| app/programs/active.tsx | 22 | 150 نقطة نبض |
| app/programs/active.tsx | 23 | عند إكمال الجلسة الرابعة بنجاح ورشاقة! |
| app/programs/active.tsx | 63 | تأكيد إكمال الجلسة |
| app/programs/active.tsx | 64 | هل ترغب في تسجيل هذه الجلسة كمكتملة؟ |
| app/programs/active.tsx | 66 | إلغاء |
| app/programs/active.tsx | 68 | نعم، اكتملت |
| app/programs/active.tsx | 79 | تهانينا! |
| app/programs/active.tsx | 79 | لقد ربحت ${selectedProg.milestoneReward} لمتابعتك التزامك بالبرنامج. |
| app/programs/active.tsx | 84 | خطأ |
| app/programs/active.tsx | 84 | تعذر تحديث الجلسة، حاول مرة أخرى |
| app/programs/active.tsx | 116 | برنامج |
| app/programs/active.tsx | 128 | المدة: ${selectedProg.duration} |
| app/programs/active.tsx | 159 | تأكيد الحضور أو إعادة الجدولة |
| app/programs/active.tsx | 159 | التأكيد |
| app/programs/active.tsx | 159 | تم تأكيد موعد حضورك بنجاح. |
| app/programs/active.tsx | 177 | جدول الجلسات والزيارات |
| app/reports/ai-analysis.tsx | 21 | بشكل عام نتائجك جيدة مع ملاحظتين تحتاج متابعة: ارتفاع طفيف في سكر الدم (صائم وتراكمي) ونقص في فيتامين D. |
| app/reports/ai-analysis.tsx | 25 | سكر الدم مرتفع قليلاً |
| app/reports/ai-analysis.tsx | 28 | سكر الصائم 105 mg/dL (الطبيعي أقل من 100) والتراكمي HbA1c 6.8% (الطبيعي أقل من 5.7%). هذا يشير لحالة ما قبل السكري. |
| app/reports/ai-analysis.tsx | 30 | متابعة مع طبيب الغدد الصماء أو الباطنية |
| app/reports/ai-analysis.tsx | 31 | قياس السكر بانتظام (صائم وبعد الأكل) |
| app/reports/ai-analysis.tsx | 32 | تقليل السكريات والنشويات المكررة |
| app/reports/ai-analysis.tsx | 33 | رياضة 30 دقيقة يومياً على الأقل |
| app/reports/ai-analysis.tsx | 34 | فحص HbA1c بعد 3 أشهر |
| app/reports/ai-analysis.tsx | 39 | نقص فيتامين D |
| app/reports/ai-analysis.tsx | 42 | فيتامين D عندك 22 ng/mL والمستوى الطبيعي فوق 30. نقص فيتامين D شائع في المنطقة ويؤثر على العظام والمناعة. |
| app/reports/ai-analysis.tsx | 44 | مكمل فيتامين D3 بجرعة 2000-4000 IU يومياً |
| app/reports/ai-analysis.tsx | 45 | التعرض للشمس 15-20 دقيقة يومياً |
| app/reports/ai-analysis.tsx | 46 | أطعمة غنية بفيتامين D: سمك السلمون، البيض، الحليب المدعم |
| app/reports/ai-analysis.tsx | 47 | إعادة الفحص بعد 3 أشهر |
| app/reports/ai-analysis.tsx | 52 | صورة الدم طبيعية بالكامل |
| app/reports/ai-analysis.tsx | 55 | الهيموجلوبين وكريات الدم والصفائح كلها في المعدل الطبيعي. لا يوجد أي فقر دم أو التهاب. |
| app/reports/ai-analysis.tsx | 60 | وظائف الكبد والكلى ممتازة |
| app/reports/ai-analysis.tsx | 62 | جميع إنزيمات الكبد والكرياتينين واليوريا في المعدل الطبيعي. |
| app/reports/ai-analysis.tsx | 67 | الدهون تحت السيطرة |
| app/reports/ai-analysis.tsx | 70 | الكوليسترول الكلي 195 والدهون الثلاثية 145 — كلها ضمن المعدل الطبيعي. |
| app/reports/ai-analysis.tsx | 75 | استشارة طبيب باطنية أو غدد صماء لمتابعة السكر |
| app/reports/ai-analysis.tsx | 76 | بدء مكمل فيتامين D3 |
| app/reports/ai-analysis.tsx | 77 | إعادة تحليل السكر التراكمي بعد 3 أشهر |
| app/reports/ai-analysis.tsx | 78 | إعادة فحص فيتامين D بعد 3 أشهر |
| app/reports/ai-analysis.tsx | 204 | يحتاج متابعة |
| app/reports/ai-analysis.tsx | 204 | ممتاز |
| app/reports/ai-analysis.tsx | 252 | الخطوات القادمة |
| app/reports/ai-analysis.tsx | 287 | استشارة طبيب حول النتائج |
| app/reports/ai-analysis.tsx | 293 | طلب أدوية مقترحة |
| app/reports/hub.tsx | 28 | تحاليل دم شاملة |
| app/reports/hub.tsx | 30 | مختبرات البرج |
| app/reports/hub.tsx | 31 | 15 يونيو 2026 |
| app/reports/hub.tsx | 32 | مكتمل |
| app/reports/hub.tsx | 37 | أشعة سينية — صدر |
| app/reports/hub.tsx | 39 | مركز الطائف |
| app/reports/hub.tsx | 40 | 10 يونيو 2026 |
| app/reports/hub.tsx | 41 | مكتمل |
| app/reports/hub.tsx | 46 | وظائف الغدة الدرقية |
| app/reports/hub.tsx | 48 | مختبرات البرج |
| app/reports/hub.tsx | 49 | 1 يونيو 2026 |
| app/reports/hub.tsx | 50 | مكتمل |
| app/reports/hub.tsx | 55 | تحليل بول كامل |
| app/reports/hub.tsx | 57 | مختبرات الفا |
| app/reports/hub.tsx | 58 | 25 مايو 2026 |
| app/reports/hub.tsx | 59 | مكتمل |
| app/reports/hub.tsx | 104 | الكل |
| app/reports/hub.tsx | 109 | تحاليل |
| app/reports/hub.tsx | 115 | أشعة |
| app/reports/hub.tsx | 171 | ${r.abnormal} يحتاج متابعة |
| app/reports/hub.tsx | 183 | عرض التفاصيل |
| app/reports/hub.tsx | 195 | تحليل AI |
| app/reports/passport.tsx | 43 | مريض |
| app/reports/passport.tsx | 44 | غير محدد |
| app/reports/passport.tsx | 45 | لا يوجد |
| app/reports/passport.tsx | 49 | الملف الطبي السريع للمريض: ${name}\nفصيلة الدم: ${bloodType}\nالحساسية: ${allergies} |
| app/reports/passport.tsx | 112 | رمز تحقق موقّع من المنصة |
| app/reports/passport.tsx | 112 | رمز التحقق غير متاح |
| app/reports/passport.tsx | 130 | غير محدد |
| app/reports/passport.tsx | 143 | سنة |
| app/reports/passport.tsx | 143 | أنثى |
| app/reports/passport.tsx | 143 | ذكر |
| app/reports/passport.tsx | 151 | مريض |
| app/reports/passport.tsx | 210 | مستمر |
| app/reports/passport.tsx | 244 | اتصال الطوارئ |
| app/reports/passport.tsx | 245 | هل ترغب في الاتصال بـ ${contact.name}؟ |
| app/reports/timeline.tsx | 59 | تحميل التقرير |
| app/reports/timeline.tsx | 59 | جاري تحميل ملف PDF الخاص بـ "${title}"... |
| app/reports/timeline.tsx | 60 | حسناً |
| app/reports/timeline.tsx | 105 | الكل |
| app/reports/timeline.tsx | 106 | استشارات |
| app/reports/timeline.tsx | 107 | تحاليل |
| app/reports/timeline.tsx | 108 | وصفات |
| app/reports/timeline.tsx | 109 | مؤشرات |
| app/reports/view-report.tsx | 56 | طبيعي |
| app/reports/view-report.tsx | 56 | مرتفع |
| app/reports/view-report.tsx | 56 | منخفض |
| app/reports/view-report.tsx | 72 | تحميل PDF |
| app/reports/view-report.tsx | 72 | تم تجهيز التقرير كملف PDF — جاري التحميل... |
| app/reports/view-report.tsx | 73 | حسناً |
| app/reports/view-report.tsx | 82 | مشاركة |
| app/reports/view-report.tsx | 82 | جاري مشاركة التقرير... |
| app/reports/view-report.tsx | 291 | تحميل PDF |
| app/reports/view-report.tsx | 300 | تحليل AI |
| app/returns/detail.tsx | 25 | قيد المراجعة |
| app/returns/detail.tsx | 26 | تم قبول الطلب |
| app/returns/detail.tsx | 27 | تم الاسترداد المالي |
| app/returns/detail.tsx | 28 | طلب مرفوض |
| app/returns/detail.tsx | 32 | طلب صيدلية |
| app/returns/detail.tsx | 33 | استشارة طبية |
| app/returns/detail.tsx | 34 | تحاليل ومختبر |
| app/returns/detail.tsx | 35 | تمريض منزلي |
| app/returns/detail.tsx | 36 | مطالبة تأمين |
| app/returns/detail.tsx | 40 | محفظة نبض |
| app/returns/detail.tsx | 41 | البطاقة الأصلية |
| app/returns/detail.tsx | 42 | الحساب البنكي |
| app/returns/detail.tsx | 67 | دواء تالف أو منتهي الصلاحية |
| app/returns/detail.tsx | 95 | تم تقديم طلب الإرجاع |
| app/returns/detail.tsx | 96 | تلقينا طلبك بنجاح وجاري التحقق |
| app/returns/detail.tsx | 101 | مراجعة الطلب والمستندات |
| app/returns/detail.tsx | 102 | يقوم الفريق الطبي بمراجعة الأسباب والمرفقات |
| app/returns/detail.tsx | 107 | الموافقة وتحويل المبلغ |
| app/returns/detail.tsx | 108 | استرداد القيمة إلى: ${REFUND_LABELS[data?.refund_method as keyof typeof REFUND_LABELS] \|\| "المحفظة"} |
| app/returns/detail.tsx | 153 | رقم الإرجاع |
| app/returns/detail.tsx | 155 | الخدمة الأصلية |
| app/returns/detail.tsx | 156 | غير معروف |
| app/returns/detail.tsx | 158 | رقم الفاتورة/الطلب |
| app/returns/detail.tsx | 158 | غير معروف |
| app/returns/detail.tsx | 159 | المبلغ المسترد |
| app/returns/detail.tsx | 159 | ${data?.amount \|\| 0} ريال |
| app/returns/detail.tsx | 160 | سبب الإرجاع |
| app/returns/detail.tsx | 160 | غير محدد |
| app/returns/detail.tsx | 162 | طريقة الاسترداد |
| app/returns/detail.tsx | 163 | محفظة نبض |
| app/returns/hub.tsx | 27 | قيد المراجعة |
| app/returns/hub.tsx | 78 | طلب صيدلية #${r.order_id.substring(0, 8)} |
| app/returns/hub.tsx | 79 | طلب إرجاع #${r.id.substring(0, 8)} |
| app/returns/hub.tsx | 90 | محفظة نبض |
| app/returns/hub.tsx | 93 | اكتمل |
| app/returns/hub.tsx | 95 | مرفوض |
| app/returns/hub.tsx | 96 | خلال 24-48 ساعة |
| app/returns/hub.tsx | 138 | طلب إرجاع |
| app/returns/hub.tsx | 139 | ${totalPending} ر |
| app/returns/hub.tsx | 139 | قيد الاسترداد |
| app/returns/hub.tsx | 144 | مكتمل |
| app/returns/hub.tsx | 194 | الكل |
| app/returns/hub.tsx | 195 | قيد المراجعة |
| app/returns/hub.tsx | 196 | موافق |
| app/returns/hub.tsx | 197 | مكتمل |
| app/returns/hub.tsx | 198 | مرفوض |
| app/returns/new-request.tsx | 19 | طلب صيدلية |
| app/returns/new-request.tsx | 20 | استشارة طبية |
| app/returns/new-request.tsx | 21 | تحاليل ومختبر |
| app/returns/new-request.tsx | 22 | تمريض منزلي |
| app/returns/new-request.tsx | 23 | مطالبة تأمين |
| app/returns/new-request.tsx | 27 | دواء تالف أو منتهي الصلاحية |
| app/returns/new-request.tsx | 27 | خطأ في الطلب |
| app/returns/new-request.tsx | 27 | دواء خاطئ |
| app/returns/new-request.tsx | 27 | لم يصل الطلب |
| app/returns/new-request.tsx | 27 | كميات ناقصة |
| app/returns/new-request.tsx | 27 | سبب آخر |
| app/returns/new-request.tsx | 28 | إلغاء الموعد |
| app/returns/new-request.tsx | 28 | الطبيب لم يحضر |
| app/returns/new-request.tsx | 28 | جودة الاستشارة |
| app/returns/new-request.tsx | 28 | مشكلة تقنية |
| app/returns/new-request.tsx | 28 | سبب آخر |
| app/returns/new-request.tsx | 29 | تكرار الطلب |
| app/returns/new-request.tsx | 29 | إلغاء التحليل |
| app/returns/new-request.tsx | 29 | خطأ في النتائج |
| app/returns/new-request.tsx | 29 | لم يتم السحب |
| app/returns/new-request.tsx | 29 | سبب آخر |
| app/returns/new-request.tsx | 30 | الممرض لم يحضر |
| app/returns/new-request.tsx | 30 | تأخر عن الموعد |
| app/returns/new-request.tsx | 30 | جودة الخدمة |
| app/returns/new-request.tsx | 30 | إلغاء الطلب |
| app/returns/new-request.tsx | 30 | سبب آخر |
| app/returns/new-request.tsx | 31 | دفع زائد |
| app/returns/new-request.tsx | 31 | خطأ في الحساب |
| app/returns/new-request.tsx | 31 | خدمة غير مغطاة |
| app/returns/new-request.tsx | 31 | سبب آخر |
| app/returns/new-request.tsx | 35 | محفظة نبض |
| app/returns/new-request.tsx | 35 | فوري |
| app/returns/new-request.tsx | 36 | البطاقة الأصلية |
| app/returns/new-request.tsx | 36 | 3-5 أيام |
| app/returns/new-request.tsx | 37 | حساب بنكي |
| app/returns/new-request.tsx | 37 | 5-7 أيام |
| app/returns/new-request.tsx | 42 | خلال 24 ساعة من الاستلام وبحالة سليمة |
| app/returns/new-request.tsx | 43 | إلغاء قبل 24 ساعة — 50% قبل 12 ساعة |
| app/returns/new-request.tsx | 44 | قبل إجراء التحليل — 50% إذا بدأ السحب |
| app/returns/new-request.tsx | 45 | إذا لم يبدأ الممرض الخدمة بعد |
| app/returns/new-request.tsx | 46 | في حالة ثبوت خطأ في الحساب |
| app/returns/new-request.tsx | 109 | طلب إرجاع جديد |
| app/returns/new-request.tsx | 109 | تفاصيل الطلب |
| app/returns/new-request.tsx | 109 | تأكيد الطلب |
| app/returns/new-request.tsx | 126 | النوع |
| app/returns/new-request.tsx | 126 | التفاصيل |
| app/returns/new-request.tsx | 126 | التأكيد |
| app/returns/new-request.tsx | 181 | مثال: ORD-2024-001 |
| app/returns/new-request.tsx | 204 | اشرح مشكلتك بالتفصيل... |
| app/returns/new-request.tsx | 211 | صورة ${p.length + 1} |
| app/returns/new-request.tsx | 244 | نوع الخدمة |
| app/returns/new-request.tsx | 283 | جاري الإرسال... |
| app/returns/new-request.tsx | 283 | إرسال طلب الإرجاع |
| app/reviews/index.tsx | 25 | الدقة في المعلومات |
| app/reviews/index.tsx | 26 | الوضوح في الشرح |
| app/reviews/index.tsx | 27 | الاهتمام بالمريض |
| app/reviews/index.tsx | 28 | سرعة الاستجابة |
| app/reviews/index.tsx | 74 | د. أحمد محمد السيد |
| app/reviews/index.tsx | 160 | شارك تجربتك مع الآخرين... |
| app/room/[id].tsx | 133 | تعذر الانضمام للغرفة. يرجى التأكد من الموعد. |
| app/search/index.tsx | 9 | الكل |
| app/search/index.tsx | 9 | أطباء |
| app/search/index.tsx | 9 | صيدلية |
| app/search/index.tsx | 9 | تحاليل |
| app/search/index.tsx | 9 | مقالات |
| app/search/index.tsx | 12 | أطباء |
| app/search/index.tsx | 12 | دكتور |
| app/search/index.tsx | 12 | صيدلية |
| app/search/index.tsx | 12 | دواء |
| app/search/index.tsx | 12 | تحاليل |
| app/search/index.tsx | 12 | تحليل |
| app/search/index.tsx | 12 | مقالات |
| app/search/index.tsx | 12 | مقال |
| app/search/index.tsx | 40 | بانادول |
| app/search/index.tsx | 40 | طبيب أطفال |
| app/search/index.tsx | 40 | تحليل سكر |
| app/search/index.tsx | 56 | دكتور |
| app/search/index.tsx | 58 | باقة |
| app/search/index.tsx | 60 | دواء |
| app/search/index.tsx | 62 | تحليل |
| app/search/index.tsx | 74 | ابحث عن طبيب، دواء، تحليل... |
| app/search/index.tsx | 105 | عمليات بحث سابقة |
| app/search/index.tsx | 119 | النتائج |
| app/search/index.tsx | 138 | عرض |
| app/search/index.tsx | 171 | ر.س |
| app/settings/about.tsx | 21 | الموقع الإلكتروني |
| app/settings/about.tsx | 27 | تويتر |
| app/settings/about.tsx | 33 | إنستغرام |
| app/settings/about.tsx | 41 | فريق الهندسة |
| app/settings/about.tsx | 42 | تطوير التطبيق والبنية التحتية |
| app/settings/about.tsx | 45 | فريق المنتج |
| app/settings/about.tsx | 45 | التصميم وتجربة المستخدم |
| app/settings/about.tsx | 47 | الفريق الطبي |
| app/settings/about.tsx | 48 | المراجعة والاستشارات الطبية |
| app/settings/about.tsx | 51 | فريق الدعم |
| app/settings/about.tsx | 51 | خدمة العملاء على مدار الساعة |
| app/settings/data.tsx | 37 | تحميل نسخة من بياناتي |
| app/settings/data.tsx | 38 | JSON / PDF — يصل خلال 24 ساعة |
| app/settings/data.tsx | 44 | نقل بياناتي لمنصة أخرى |
| app/settings/data.tsx | 45 | FHIR R4 / HL7 متوافق |
| app/settings/data.tsx | 51 | ما البيانات التي نجمعها؟ |
| app/settings/data.tsx | 52 | راجع سياسة الخصوصية |
| app/settings/data.tsx | 58 | حذف بياناتي نهائياً |
| app/settings/data.tsx | 59 | لا يمكن التراجع عن هذا الإجراء |
| app/settings/feedback.tsx | 45 | اقتراح |
| app/settings/feedback.tsx | 45 | مشكلة |
| app/settings/feedback.tsx | 45 | شكوى |
| app/settings/feedback.tsx | 45 | إطراء |
| app/settings/feedback.tsx | 45 | استفسار |
| app/settings/feedback.tsx | 153 | اكتب ملاحظتك هنا... |
| app/settings/help.tsx | 19 | الحجوزات |
| app/settings/help.tsx | 20 | الصيدلية |
| app/settings/help.tsx | 21 | الدفع |
| app/settings/help.tsx | 22 | التأمين |
| app/settings/help.tsx | 23 | الإرجاع |
| app/settings/help.tsx | 24 | الحساب |
| app/settings/help.tsx | 65 | محادثة فورية |
| app/settings/help.tsx | 71 | إرسال بريد |
| app/settings/help.tsx | 77 | اتصال مباشر |
| app/settings/index.tsx | 26 | الملف الشخصي |
| app/settings/index.tsx | 27 | الأمان |
| app/settings/index.tsx | 28 | الخصوصية |
| app/settings/index.tsx | 31 | الوضع الليلي |
| app/settings/index.tsx | 32 | اللغة |
| app/settings/index.tsx | 35 | الإشعارات |
| app/settings/index.tsx | 40 | المساعدة |
| app/settings/index.tsx | 41 | تواصل معنا |
| app/settings/index.tsx | 42 | الشروط والأحكام |
| app/settings/index.tsx | 43 | عن التطبيق |
| app/settings/index.tsx | 45 | تسجيل الخروج |
| app/settings/index.tsx | 54 | اللغة |
| app/settings/index.tsx | 58 | تسجيل الخروج |
| app/settings/index.tsx | 106 | اللغة |
| app/settings/notifications-settings.tsx | 24 | الإشعارات العامة |
| app/settings/notifications-settings.tsx | 25 | تحديثات عامة ومعلومات مهمة من التطبيق |
| app/settings/notifications-settings.tsx | 30 | تذكير المواعيد |
| app/settings/notifications-settings.tsx | 31 | تذكيرات قبل المواعيد المحجوزة بساعة و15 دقيقة |
| app/settings/notifications-settings.tsx | 36 | تحديثات الطلبات |
| app/settings/notifications-settings.tsx | 37 | متابعة حالة طلبات الصيدلية والتوصيل |
| app/settings/notifications-settings.tsx | 42 | عروض وخصومات |
| app/settings/notifications-settings.tsx | 43 | عروض حصرية وخصومات على الخدمات والمنتجات |
| app/settings/notifications-settings.tsx | 48 | تذكير الأدوية |
| app/settings/notifications-settings.tsx | 49 | تنبيهات بمواعيد تناول الأدوية حسب جدولك |
| app/settings/notifications-settings.tsx | 54 | رسائل الأطباء |
| app/settings/notifications-settings.tsx | 55 | رسائل وملاحظات من الأطباء والاستشاريين |
| app/settings/notifications-settings.tsx | 60 | إشعارات الطوارئ |
| app/settings/notifications-settings.tsx | 61 | تنبيهات السلامة والطوارئ الصحية الحرجة |
| app/settings/notifications-settings.tsx | 70 | الصوت |
| app/settings/notifications-settings.tsx | 71 | تشغيل صوت عند وصول الإشعارات |
| app/settings/notifications-settings.tsx | 76 | الاهتزاز |
| app/settings/notifications-settings.tsx | 77 | تفعيل الاهتزاز مع الإشعارات |
| app/settings/notifications.tsx | 25 | المواعيد والحجوزات |
| app/settings/notifications.tsx | 29 | تذكير قبل الموعد |
| app/settings/notifications.tsx | 30 | قبل ساعة وقبل يوم |
| app/settings/notifications.tsx | 35 | تأكيد الحجز |
| app/settings/notifications.tsx | 36 | عند تأكيد أي حجز |
| app/settings/notifications.tsx | 41 | إلغاء الموعد |
| app/settings/notifications.tsx | 42 | إذا ألغى الطبيب الموعد |
| app/settings/notifications.tsx | 48 | الأدوية والصحة |
| app/settings/notifications.tsx | 52 | تذكير الدواء |
| app/settings/notifications.tsx | 53 | في أوقات جرعاتك |
| app/settings/notifications.tsx | 58 | تنبيه نفاد الدواء |
| app/settings/notifications.tsx | 59 | عند قرب انتهاء المخزون |
| app/settings/notifications.tsx | 64 | نتائج التحاليل |
| app/settings/notifications.tsx | 65 | عند صدور النتائج |
| app/settings/notifications.tsx | 71 | الطلبات والمعاملات |
| app/settings/notifications.tsx | 75 | حالة الطلب |
| app/settings/notifications.tsx | 76 | تحديثات الصيدلية والتوصيل |
| app/settings/notifications.tsx | 81 | إشعارات الدفع |
| app/settings/notifications.tsx | 82 | كل عملية دفع أو استرداد |
| app/settings/notifications.tsx | 87 | التأمين والمطالبات |
| app/settings/notifications.tsx | 88 | تحديثات المطالبات |
| app/settings/notifications.tsx | 94 | العروض والمجتمع |
| app/settings/notifications.tsx | 98 | العروض والخصومات |
| app/settings/notifications.tsx | 99 | عروض حصرية وموسمية |
| app/settings/notifications.tsx | 104 | نقاط نبض |
| app/settings/notifications.tsx | 105 | كسب أو استبدال النقاط |
| app/settings/notifications.tsx | 110 | المجتمع |
| app/settings/notifications.tsx | 111 | ردود وتعليقات على منشوراتك |
| app/settings/privacy.tsx | 56 | مشاركة الموقع |
| app/settings/privacy.tsx | 57 | لإيجاد أقرب المزودين الصحيين |
| app/settings/privacy.tsx | 61 | تحليلات الاستخدام |
| app/settings/privacy.tsx | 62 | مساعدتنا في تحسين التطبيق |
| app/settings/privacy.tsx | 66 | مشاركة البيانات الصحية |
| app/settings/privacy.tsx | 67 | مشاركة بيانات صحية مجهولة للأبحاث |
| app/settings/privacy.tsx | 71 | التواصل التسويقي |
| app/settings/privacy.tsx | 72 | إرسال عروض وإعلانات مخصصة |
| app/settings/privacy.tsx | 76 | مشاركة مع أطراف ثالثة |
| app/settings/privacy.tsx | 77 | شركاء التأمين والصيدليات |
| app/settings/security.tsx | 62 | خطأ |
| app/settings/security.tsx | 62 | كلمة المرور الجديدة وتأكيدها غير متطابقين |
| app/settings/security.tsx | 71 | نجح |
| app/settings/security.tsx | 71 | تم تغيير كلمة المرور بنجاح |
| app/settings/security.tsx | 77 | خطأ |
| app/settings/security.tsx | 77 | فشل تغيير كلمة المرور، تأكد من كلمة المرور الحالية |
| app/settings/security.tsx | 177 | إلغاء |
| app/settings/security.tsx | 177 | تغيير |
| app/settings/security.tsx | 195 | الكلمة الحالية |
| app/settings/security.tsx | 199 | الكلمة الجديدة |
| app/settings/security.tsx | 201 | تأكيد الكلمة الجديدة |
| app/settings/security.tsx | 240 | جاري الحفظ... |
| app/settings/security.tsx | 240 | حفظ كلمة المرور |
| app/settings/terms.tsx | 19 | مقدمة |
| app/shared/location-picker.tsx | 99 | الإذن مرفوض |
| app/shared/location-picker.tsx | 99 | يرجى السماح بالوصول للموقع من الإعدادات. |
| app/shared/location-picker.tsx | 124 | الموقع الحالي |
| app/shared/location-picker.tsx | 159 | المنزل |
| app/shared/location-picker.tsx | 234 | عناويني |
| app/shared/location-picker.tsx | 235 | على الخريطة |
| app/shared/location-picker.tsx | 236 | عنوان جديد |
| app/shared/location-picker.tsx | 370 | العمل |
| app/shared/location-picker.tsx | 403 | ، ${addr.city} |
| app/shared/location-picker.tsx | 585 | اسم العنوان (مثال: المنزل) |
| app/shared/location-picker.tsx | 588 | الشارع والحي |
| app/shared/location-picker.tsx | 591 | رقم المبنى / اسمه |
| app/shared/location-picker.tsx | 596 | الطابق (اختياري) |
| app/shared/location-picker.tsx | 601 | ملاحظات للمندوب (اختياري) |
| app/support/chat.tsx | 29 | إلغاء حجز |
| app/support/chat.tsx | 30 | مشكلة في طلب |
| app/support/chat.tsx | 31 | استرداد المبلغ |
| app/support/chat.tsx | 32 | سؤال عن التأمين |
| app/support/chat.tsx | 33 | شكوى |
| app/support/chat.tsx | 54 | مرحباً! أنا نبض، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟ |
| app/support/chat.tsx | 104 | عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً. |
| app/support/chat.tsx | 238 | اكتب رسالتك... |
| app/support/ticket.tsx | 79 | اليوم |
| app/support/ticket.tsx | 80 | اليوم |
| app/support/ticket.tsx | 89 | مفتوح |
| app/voice/index.tsx | 29 | احجز موعد مع طبيب قلب |
| app/voice/index.tsx | 31 | استشارة |
| app/voice/index.tsx | 35 | اطلب بنادول من الصيدلية |
| app/voice/index.tsx | 37 | صيدلية |
| app/voice/index.tsx | 41 | احجز تحليل صورة دم |
| app/voice/index.tsx | 43 | تحاليل |
| app/voice/index.tsx | 47 | اتصل بالإسعاف |
| app/voice/index.tsx | 49 | طوارئ |
| app/voice/index.tsx | 53 | احجز ممرض منزلي |
| app/voice/index.tsx | 55 | تمريض |
| app/voice/index.tsx | 59 | ما هي مواعيدي اليوم؟ |
| app/voice/index.tsx | 61 | مواعيد |
| app/voice/index.tsx | 66 | احجز موعد مع طبيب قلب غداً |
| app/voice/index.tsx | 67 | اطلب أدويتي المعتادة |
| app/voice/index.tsx | 68 | كم نقطة نبض لدي؟ |
| app/voice/index.tsx | 69 | أقرب صيدلية مفتوحة |
| app/voice/index.tsx | 70 | تذكير دوائي القادم |
| app/voice/index.tsx | 75 | جاري البحث عن أطباء القلب المتاحين... وجدت 3 مواعيد متاحة غداً! |
| app/voice/index.tsx | 76 | تم إضافة بنادول إلى سلة الصيدلية. هل تريد إتمام الطلب؟ |
| app/voice/index.tsx | 77 | وجدت موعداً لتحليل صورة الدم غداً الساعة 8 صباحاً في مختبر الدقة. |
| app/voice/index.tsx | 78 | جاري الاتصال بالإسعاف 997 الآن... |
| app/voice/index.tsx | 79 | وجدت ممرضاً متاحاً اليوم بعد الظهر. هل تريد تأكيد الحجز؟ |
| app/voice/index.tsx | 81 | لديك موعدان اليوم:\n• 2:00 م — د. أحمد السيد (قلب)\n• 5:30 م — تحليل سكر |
| app/voice/index.tsx | 261 | اضغط للتحدث |
| app/voice/index.tsx | 262 | أنا أستمع... |
| app/voice/index.tsx | 263 | جاري المعالجة... |
| app/wallet/cards.tsx | 89 | تنبيه |
| app/wallet/cards.tsx | 90 | لا يمكن حذف البطاقة الافتراضية. قم بتعيين بطاقة أخرى كافتراضية أولاً. |
| app/wallet/cards.tsx | 91 | حسناً |
| app/wallet/cards.tsx | 96 | حذف البطاقة |
| app/wallet/cards.tsx | 97 | هل تريد حذف البطاقة المنتهية بـ ${card?.last4}؟ |
| app/wallet/cards.tsx | 99 | إلغاء |
| app/wallet/cards.tsx | 101 | حذف |
| app/wallet/cards.tsx | 110 | خطأ |
| app/wallet/cards.tsx | 110 | تعذر حذف البطاقة |
| app/wallet/cards.tsx | 304 | فيزا |
| app/wallet/cards.tsx | 305 | ماستركارد |
| app/wallet/cards.tsx | 306 | مدى |
| app/wallet/cards.tsx | 338 | إضافة بطاقة جديدة |
| app/wallet/cards.tsx | 342 | إضافة بطاقة |
| app/wallet/cards.tsx | 342 | اختر نوع البطاقة |
| app/wallet/cards.tsx | 373 | إلغاء |
| app/wallet/hub.tsx | 23 | شحن المحفظة |
| app/wallet/hub.tsx | 24 | تحويل |
| app/wallet/hub.tsx | 25 | السجل |
| app/wallet/hub.tsx | 83 | استشارة |
| app/wallet/hub.tsx | 83 | استرداد |
| app/wallet/hub.tsx | 83 | شحن |
| app/wallet/topup.tsx | 32 | شحن الرصيد |
| app/wallet/topup.tsx | 33 | أدخل المبلغ الذي ترغب في شحنه عبر ${method} (ر.س): |
| app/wallet/topup.tsx | 35 | إلغاء |
| app/wallet/topup.tsx | 37 | شحن |
| app/wallet/topup.tsx | 41 | خطأ |
| app/wallet/topup.tsx | 41 | يرجى إدخال مبلغ صحيح |
| app/wallet/topup.tsx | 50 | تم الشحن بنجاح |
| app/wallet/topup.tsx | 51 | تم إضافة ${amount} ر.س إلى محفظتك |
| app/wallet/topup.tsx | 55 | خطأ |
| app/wallet/topup.tsx | 55 | تعذر إتمام عملية الشحن |
| app/wallet/topup.tsx | 105 | الخيارات |
| app/wallet/topup.tsx | 107 | مدى / فيزا |
| app/wallet/topup.tsx | 145 | التحويل البنكي |
| app/wallet/transactions.tsx | 20 | الكل |
| app/wallet/transactions.tsx | 20 | خصم |
| app/wallet/transactions.tsx | 20 | إيداع |
| app/wallet/transactions.tsx | 20 | تحويل |
| app/wallet/transactions.tsx | 20 | شحن |
| app/wallet/transactions.tsx | 32 | الكل |
| app/wallet/transactions.tsx | 60 | الكل |
| app/wallet/transactions.tsx | 62 | خصم |
| app/wallet/transactions.tsx | 64 | إيداع |
| app/wallet/transactions.tsx | 66 | تحويل |
| app/wallet/transactions.tsx | 125 | } {item.amount.toFixed(2)} ر </AppText> <AppText variant= |
| app/wallet/transfer.tsx | 32 | تحويل الرصيد |
| app/wallet/transfer.tsx | 33 | أدخل رقم الجوال أو البريد الإلكتروني للمستلم (${type === "family" ? "العائلة" : "الطبيب"}): |
| app/wallet/transfer.tsx | 35 | إلغاء |
| app/wallet/transfer.tsx | 37 | متابعة |
| app/wallet/transfer.tsx | 40 | خطأ |
| app/wallet/transfer.tsx | 40 | يرجى إدخال معرف مستلم صحيح |
| app/wallet/transfer.tsx | 44 | تحديد المبلغ |
| app/wallet/transfer.tsx | 45 | أدخل المبلغ المراد تحويله (ر.س): |
| app/wallet/transfer.tsx | 47 | إلغاء |
| app/wallet/transfer.tsx | 49 | تأكيد التحويل |
| app/wallet/transfer.tsx | 53 | خطأ |
| app/wallet/transfer.tsx | 53 | يرجى إدخال مبلغ صحيح |
| app/wallet/transfer.tsx | 57 | خطأ |
| app/wallet/transfer.tsx | 57 | رصيدك الحالي غير كافٍ |
| app/wallet/transfer.tsx | 66 | تم التحويل بنجاح |
| app/wallet/transfer.tsx | 67 | تم تحويل ${amount} ر.س إلى المستلم بنجاح. |
| app/wallet/transfer.tsx | 72 | خطأ |
| app/wallet/transfer.tsx | 73 | فشل التحويل. يرجى التحقق من توفر حساب للمستلم بالرقم المدخل. |
| app/wallet/transfer.tsx | 128 | الخيارات |
| app/wearables/hub.tsx | 48 | تنبيه |
| app/wearables/hub.tsx | 48 | الرجاء ربط جهاز واحد على الأقل للمزامنة. |
| app/wearables/hub.tsx | 119 | خطأ |
| app/wearables/hub.tsx | 119 | حدث خطأ أثناء مزامنة البيانات. |
| app/wearables/hub.tsx | 146 | الأجهزة المتوفرة للربط |
| app/wearables/hub.tsx | 264 | جاري المزامنة... |
| app/wearables/hub.tsx | 264 | مزامنة القراءات الآن |
| src/__tests__/utils/testUtils.ts | 11 | نبض بلس TEST |
| src/__tests__/utils/testUtils.ts | 103 | مستخدم تجريبي |
| src/components/BottomNavBar.tsx | 35 | الرئيسية |
| src/components/BottomNavBar.tsx | 36 | الصيدلية |
| src/components/BottomNavBar.tsx | 37 | طبيب |
| src/components/BottomNavBar.tsx | 38 | تحاليل |
| src/components/BottomNavBar.tsx | 39 | تمريض |
| src/components/BottomNavBar.tsx | 40 | صحتي |
| src/components/Header.tsx | 154 | العربية |
| src/components/Header.tsx | 154 | اردو |
| src/components/NotificationHandler.tsx | 27 | طبيب نبض |
| src/components/NotificationHandler.tsx | 64 | طبيب نبض |
| src/components/livekit-view.tsx | 113 | د. محمد أحمد الكردي |
| src/components/livekit-view.tsx | 116 | في انتظار انضمام الطبيب... |
| src/components/livekit-view.tsx | 116 | مكالمة نشطة |
| src/components/livekit-view.tsx | 144 | تفعيل الصوت |
| src/components/livekit-view.tsx | 144 | كتم |
| src/components/livekit-view.tsx | 151 | تشغيل الكاميرا |
| src/components/livekit-view.tsx | 151 | إيقاف الكاميرا |
| src/components/livekit-view.tsx | 158 | سماعة الهاتف |
| src/components/livekit-view.tsx | 158 | مكبر الصوت |
| src/components/ui.tsx | 304 | يتطلب وصفة |
| src/components/ui.tsx | 304 | أضف للسلة |
| src/components/ui.tsx | 398 | تأمين |
| src/config/seo.ts | 158 | نبض بلس |
| src/constants/index.ts | 1 | نبض بلس |
| src/constants/insurance.ts | 27 | الفئة A |
| src/constants/insurance.ts | 28 | الفئة B |
| src/constants/insurance.ts | 29 | الفئة C |
| src/constants/insurance.ts | 30 | الفئة D |
| src/constants/insurance.ts | 40 | أساسي |
| src/constants/insurance.ts | 46 | بوبا العربية |
| src/constants/insurance.ts | 48 | بوبا |
| src/constants/insurance.ts | 52 | بوبا VIP فردي |
| src/constants/insurance.ts | 53 | بوبا عائلي A |
| src/constants/insurance.ts | 54 | بوبا مؤسسات B |
| src/constants/insurance.ts | 55 | بوبا مؤسسات C |
| src/constants/insurance.ts | 60 | تكافل الراجحي |
| src/constants/insurance.ts | 62 | تكافل |
| src/constants/insurance.ts | 66 | تكافل VIP فردي |
| src/constants/insurance.ts | 67 | تكافل عائلي A |
| src/constants/insurance.ts | 68 | تكافل مؤسسات B |
| src/constants/insurance.ts | 73 | ملاذ للتأمين |
| src/constants/insurance.ts | 75 | ملاذ |
| src/constants/insurance.ts | 79 | ملاذ فردي A |
| src/constants/insurance.ts | 80 | ملاذ عائلي B |
| src/constants/insurance.ts | 81 | ملاذ مؤسسات C |
| src/constants/insurance.ts | 86 | الدرع العربي |
| src/constants/insurance.ts | 88 | الدرع |
| src/constants/insurance.ts | 92 | الدرع VIP فردي |
| src/constants/insurance.ts | 93 | الدرع عائلي A |
| src/constants/insurance.ts | 94 | الدرع مؤسسات B |
| src/constants/insurance.ts | 95 | الدرع مؤسسات D |
| src/constants/insurance.ts | 100 | أكسا التعاونية |
| src/constants/insurance.ts | 102 | أكسا |
| src/constants/insurance.ts | 106 | أكسا VIP فردي |
| src/constants/insurance.ts | 107 | أكسا عائلي A |
| src/constants/insurance.ts | 108 | أكسا مؤسسات C |
| src/constants/insurance.ts | 113 | وقاية للتأمين |
| src/constants/insurance.ts | 115 | وقاية |
| src/constants/insurance.ts | 119 | وقاية فردي A |
| src/constants/insurance.ts | 120 | وقاية عائلي B |
| src/constants/insurance.ts | 121 | وقاية مؤسسات C |
| src/constants/insurance.ts | 126 | التعاونية |
| src/constants/insurance.ts | 128 | التعاونية |
| src/constants/insurance.ts | 132 | التعاونية VIP فردي |
| src/constants/insurance.ts | 133 | التعاونية عائلي A |
| src/constants/insurance.ts | 134 | التعاونية مؤسسات B |
| src/constants/insurance.ts | 135 | التعاونية مؤسسات D |
| src/constants/insurance.ts | 140 | سايكو |
| src/constants/insurance.ts | 142 | سايكو |
| src/constants/insurance.ts | 146 | سايكو فردي A |
| src/constants/insurance.ts | 147 | سايكو عائلي B |
| src/constants/insurance.ts | 148 | سايكو مؤسسات C |
| src/constants/insurance.ts | 153 | ميدغلف |
| src/constants/insurance.ts | 155 | ميدغلف |
| src/constants/insurance.ts | 159 | ميدغلف VIP فردي |
| src/constants/insurance.ts | 160 | ميدغلف عائلي A |
| src/constants/insurance.ts | 161 | ميدغلف مؤسسات B |
| src/constants/insurance.ts | 166 | الراجحي تكافل |
| src/constants/insurance.ts | 168 | الراجحي |
| src/constants/insurance.ts | 172 | الراجحي فردي A |
| src/constants/insurance.ts | 173 | الراجحي عائلي B |
| src/constants/insurance.ts | 174 | الراجحي مؤسسات C |
| src/constants/insurance.ts | 175 | الراجحي مؤسسات D |
| src/constants/insurance.ts | 180 | أليانز السعودي الفرنسي |
| src/constants/insurance.ts | 182 | أليانز |
| src/constants/insurance.ts | 186 | أليانز VIP فردي |
| src/constants/insurance.ts | 187 | أليانز عائلي A |
| src/constants/insurance.ts | 188 | أليانز مؤسسات B |
| src/constants/insurance.ts | 193 | ولاء للتأمين |
| src/constants/insurance.ts | 195 | ولاء |
| src/constants/insurance.ts | 199 | ولاء فردي A |
| src/constants/insurance.ts | 200 | ولاء عائلي B |
| src/constants/insurance.ts | 201 | ولاء مؤسسات C |
| src/constants/insurance.ts | 206 | الاتحاد التجاري |
| src/constants/insurance.ts | 208 | الاتحاد |
| src/constants/insurance.ts | 212 | الاتحاد فردي A |
| src/constants/insurance.ts | 213 | الاتحاد عائلي B |
| src/constants/insurance.ts | 214 | الاتحاد مؤسسات C |
| src/constants/insurance.ts | 215 | الاتحاد مؤسسات D |
| src/constants/insurance.ts | 220 | السعودية لإعادة التأمين |
| src/constants/insurance.ts | 222 | السعودية ري |
| src/constants/insurance.ts | 226 | السعودية ري فردي A |
| src/constants/insurance.ts | 227 | السعودية ري مؤسسات B |
| src/constants/insurance.ts | 232 | بروج للتأمين |
| src/constants/insurance.ts | 234 | بروج |
| src/constants/insurance.ts | 238 | بروج فردي A |
| src/constants/insurance.ts | 239 | بروج عائلي B |
| src/constants/insurance.ts | 240 | بروج مؤسسات C |
| src/constants/insurance.ts | 245 | الأهلي تكافل |
| src/constants/insurance.ts | 247 | الأهلي |
| src/constants/insurance.ts | 251 | الأهلي VIP فردي |
| src/constants/insurance.ts | 252 | الأهلي عائلي A |
| src/constants/insurance.ts | 253 | الأهلي مؤسسات B |
| src/constants/insurance.ts | 258 | العربية السعودية للتأمين |
| src/constants/insurance.ts | 260 | العربية |
| src/constants/insurance.ts | 264 | العربية فردي A |
| src/constants/insurance.ts | 265 | العربية عائلي B |
| src/constants/insurance.ts | 266 | العربية مؤسسات C |
| src/constants/insurance.ts | 271 | سلامة للتأمين |
| src/constants/insurance.ts | 273 | سلامة |
| src/constants/insurance.ts | 277 | سلامة فردي A |
| src/constants/insurance.ts | 278 | سلامة عائلي B |
| src/constants/insurance.ts | 279 | سلامة مؤسسات C |
| src/constants/insurance.ts | 280 | سلامة مؤسسات D |
| src/constants/insurance.ts | 285 | تشب العربية |
| src/constants/insurance.ts | 287 | تشب |
| src/constants/insurance.ts | 291 | تشب VIP فردي |
| src/constants/insurance.ts | 292 | تشب عائلي A |
| src/constants/insurance.ts | 293 | تشب مؤسسات B |
| src/constants/insurance.ts | 298 | المتوسط والخليج للتأمين |
| src/constants/insurance.ts | 300 | المتوسط |
| src/constants/insurance.ts | 304 | المتوسط فردي A |
| src/constants/insurance.ts | 305 | المتوسط عائلي B |
| src/constants/insurance.ts | 306 | المتوسط مؤسسات C |
| src/constants/insurance.ts | 311 | الصقر للتأمين |
| src/constants/insurance.ts | 313 | الصقر |
| src/constants/insurance.ts | 317 | الصقر فردي A |
| src/constants/insurance.ts | 318 | الصقر عائلي B |
| src/constants/insurance.ts | 319 | الصقر مؤسسات C |
| src/constants/insurance.ts | 324 | عناية للتأمين |
| src/constants/insurance.ts | 326 | عناية |
| src/constants/insurance.ts | 330 | عناية فردي A |
| src/constants/insurance.ts | 331 | عناية مؤسسات B |
| src/constants/insurance.ts | 332 | عناية مؤسسات D |
| src/constants/insurance.ts | 337 | الوطنية للتأمين |
| src/constants/insurance.ts | 339 | الوطنية |
| src/constants/insurance.ts | 343 | الوطنية فردي A |
| src/constants/insurance.ts | 344 | الوطنية عائلي B |
| src/constants/insurance.ts | 345 | الوطنية مؤسسات C |
| src/constants/insurance.ts | 350 | جزيرة تكافل |
| src/constants/insurance.ts | 352 | جزيرة |
| src/constants/insurance.ts | 356 | جزيرة VIP فردي |
| src/constants/insurance.ts | 357 | جزيرة عائلي A |
| src/constants/insurance.ts | 358 | جزيرة مؤسسات B |
| src/constants/insurance.ts | 363 | أمانة للتأمين |
| src/constants/insurance.ts | 365 | أمانة |
| src/constants/insurance.ts | 369 | أمانة فردي A |
| src/constants/insurance.ts | 370 | أمانة عائلي B |
| src/constants/insurance.ts | 371 | أمانة مؤسسات C |
| src/constants/insurance.ts | 376 | الإنماء طوكيو مارين |
| src/constants/insurance.ts | 378 | الإنماء |
| src/constants/insurance.ts | 382 | الإنماء فردي A |
| src/constants/insurance.ts | 383 | الإنماء عائلي B |
| src/constants/insurance.ts | 384 | الإنماء مؤسسات C |
| src/constants/insurance.ts | 385 | الإنماء مؤسسات D |
| src/constants/insurance.ts | 390 | الخليجية العامة للتأمين |
| src/constants/insurance.ts | 392 | الخليجية |
| src/constants/insurance.ts | 396 | الخليجية فردي A |
| src/constants/insurance.ts | 397 | الخليجية عائلي B |
| src/constants/insurance.ts | 398 | الخليجية مؤسسات C |
| src/constants/insurance.ts | 403 | الحياة للتأمين |
| src/constants/insurance.ts | 405 | الحياة |
| src/constants/insurance.ts | 409 | الحياة فردي A |
| src/constants/insurance.ts | 410 | الحياة مؤسسات B |
| src/constants/insurance.ts | 415 | اتحاد الخليج للتأمين |
| src/constants/insurance.ts | 417 | اتحاد الخليج |
| src/constants/insurance.ts | 421 | اتحاد الخليج فردي A |
| src/constants/insurance.ts | 422 | اتحاد الخليج عائلي B |
| src/constants/insurance.ts | 423 | اتحاد الخليج مؤسسات C |
| src/constants/insurance.ts | 428 | سوليدرتي السعودية |
| src/constants/insurance.ts | 430 | سوليدرتي |
| src/constants/insurance.ts | 434 | سوليدرتي فردي A |
| src/constants/insurance.ts | 435 | سوليدرتي عائلي B |
| src/constants/insurance.ts | 436 | سوليدرتي مؤسسات C |
| src/constants/insurance.ts | 441 | العالمية للتأمين |
| src/constants/insurance.ts | 443 | العالمية |
| src/constants/insurance.ts | 447 | العالمية فردي A |
| src/constants/insurance.ts | 448 | العالمية مؤسسات B |
| src/constants/insurance.ts | 449 | العالمية مؤسسات D |
| src/constants/specialties.ts | 39 | طب عام |
| src/constants/specialties.ts | 39 | تشخيص وعلاج الأمراض الشائعة والحالات العامة |
| src/constants/specialties.ts | 40 | طب الأطفال |
| src/constants/specialties.ts | 40 | الرعاية الطبية للرضع والأطفال والمراهقين |
| src/constants/specialties.ts | 41 | جراحة عيون |
| src/constants/specialties.ts | 41 | تشخيص وعلاج أمراض العيون والجراحة البصرية |
| src/constants/specialties.ts | 42 | قلب وأوعية دموية |
| src/constants/specialties.ts | 42 | تشخيص وعلاج أمراض القلب والأوعية الدموية |
| src/constants/specialties.ts | 43 | جراحة عظام |
| src/constants/specialties.ts | 43 | علاج إصابات العظام والمفاصل والعمود الفقري |
| src/constants/specialties.ts | 44 | أمراض جلدية |
| src/constants/specialties.ts | 44 | تشخيص وعلاج أمراض الجلد والشعر والأظافر |
| src/constants/specialties.ts | 45 | نساء وولادة |
| src/constants/specialties.ts | 45 | رعاية صحة المرأة والحمل والولادة |
| src/constants/specialties.ts | 46 | طب أسنان |
| src/constants/specialties.ts | 46 | علاج وتجميل الأسنان واللثة |
| src/constants/specialties.ts | 47 | طب نفسي |
| src/constants/specialties.ts | 47 | تشخيص وعلاج الاضطرابات النفسية والعقلية |
| src/constants/specialties.ts | 48 | أنف وأذن وحنجرة |
| src/constants/specialties.ts | 48 | علاج أمراض الأنف والأذن والحنجرة |
| src/constants/specialties.ts | 49 | مسالك بولية |
| src/constants/specialties.ts | 49 | علاج أمراض الجهاز البولي والتناسلي |
| src/constants/specialties.ts | 50 | طب داخلي |
| src/constants/specialties.ts | 50 | تشخيص الأمراض الداخلية المعقدة وإدارتها |
| src/constants/specialties.ts | 51 | جراحة عامة |
| src/constants/specialties.ts | 51 | العمليات الجراحية العامة ومنظار البطن |
| src/constants/specialties.ts | 52 | طب طوارئ |
| src/constants/specialties.ts | 52 | الرعاية الطبية العاجلة والحالات الطارئة |
| src/constants/specialties.ts | 53 | تغذية علاجية |
| src/constants/specialties.ts | 53 | التقييم الغذائي والحميات العلاجية |
| src/constants/specialties.ts | 54 | علاج طبيعي |
| src/constants/specialties.ts | 54 | إعادة تأهيل العضلات والمفاصل بعد الإصابات |
| src/constants/specialties.ts | 55 | أمراض الجهاز الهضمي |
| src/constants/specialties.ts | 55 | تشخيص وعلاج أمراض المعدة والأمعاء والكبد |
| src/constants/specialties.ts | 56 | أمراض صدرية |
| src/constants/specialties.ts | 56 | تشخيص وعلاج أمراض الجهاز التنفسي والرئتين |
| src/constants/specialties.ts | 57 | أمراض كلى |
| src/constants/specialties.ts | 57 | علاج أمراض الكلى والغسيل الكلوي |
| src/constants/specialties.ts | 58 | أمراض دم |
| src/constants/specialties.ts | 58 | تشخيص وعلاج أمراض الدم وأورام الدم |
| src/constants/specialties.ts | 59 | غدد صماء وسكري |
| src/constants/specialties.ts | 59 | علاج اضطرابات الغدد والسكري والهرمونات |
| src/constants/specialties.ts | 60 | أمراض روماتيزم |
| src/constants/specialties.ts | 60 | علاج أمراض المفاصل والأمراض المناعية |
| src/constants/specialties.ts | 61 | أمراض أعصاب |
| src/constants/specialties.ts | 61 | تشخيص وعلاج أمراض الجهاز العصبي |
| src/constants/specialties.ts | 62 | جراحة أعصاب |
| src/constants/specialties.ts | 62 | العمليات الجراحية للمخ والعمود الفقري |
| src/constants/specialties.ts | 63 | جراحة تجميل |
| src/constants/specialties.ts | 63 | الجراحة التجميلية والترميمية |
| src/constants/specialties.ts | 64 | أمراض معدية |
| src/constants/specialties.ts | 64 | تشخيص وعلاج الأمراض المعدية والوبائية |
| src/constants/specialties.ts | 65 | أشعة تشخيصية |
| src/constants/specialties.ts | 65 | التصوير الطبي والتشخيص بالأشعة |
| src/constants/specialties.ts | 66 | تخدير وعناية مركزة |
| src/constants/specialties.ts | 66 | التخدير والعناية المركزة وإدارة الألم |
| src/constants/specialties.ts | 67 | طب أسرة |
| src/constants/specialties.ts | 67 | الرعاية الصحية الشاملة لجميع أفراد الأسرة |
| src/constants/specialties.ts | 68 | أورام |
| src/constants/specialties.ts | 68 | تشخيص وعلاج الأورام السرطانية |
| src/constants/specialties.ts | 69 | طب كبار السن |
| src/constants/specialties.ts | 69 | الرعاية الصحية المتخصصة لكبار السن |
| src/constants/specialties.ts | 70 | طب الكبد |
| src/constants/specialties.ts | 70 | تشخيص وعلاج أمراض الكبد والمرارة |
| src/constants/specialties.ts | 71 | جراحة قلب مفتوح |
| src/constants/specialties.ts | 71 | العمليات الجراحية للقلب والشرايين |
| src/constants/specialties.ts | 72 | طب رياضي |
| src/constants/specialties.ts | 72 | علاج إصابات الرياضيين وتأهيلهم |
| src/constants/specialties.ts | 73 | صحة نفسية |
| src/constants/specialties.ts | 73 | الدعم النفسي والعلاج السلوكي المعرفي |
| src/constants/specialties.ts | 74 | جراحة أوعية دموية |
| src/constants/specialties.ts | 74 | جراحة الشرايين والأوردة والأوعية الليمفاوية |
| src/constants/specialties.ts | 75 | طب نووي |
| src/constants/specialties.ts | 75 | التشخيص والعلاج بالنظائر المشعة |
| src/constants/specialties.ts | 76 | جراحة صدر |
| src/constants/specialties.ts | 76 | العمليات الجراحية للصدر والرئتين |
| src/constants/specialties.ts | 77 | طب الألم |
| src/constants/specialties.ts | 77 | إدارة وعلاج الآلام المزمنة والحادة |
| src/constants/specialties.ts | 78 | طب النوم |
| src/constants/specialties.ts | 78 | تشخيص وعلاج اضطرابات النوم |
| src/constants/specialties.ts | 79 | علاج وظيفي |
| src/constants/specialties.ts | 79 | إعادة تأهيل المهارات الحياتية اليومية |
| src/constants/specialties.ts | 80 | طب الإنجاب |
| src/constants/specialties.ts | 80 | علاج العقم والمساعدة على الإنجاب |
| src/constants/specialties.ts | 81 | أمراض المناعة |
| src/constants/specialties.ts | 81 | تشخيص وعلاج أمراض الجهاز المناعي |
| src/constants/specialties.ts | 82 | جراحة الأطفال |
| src/constants/specialties.ts | 82 | العمليات الجراحية للرضع والأطفال |
| src/constants/specialties.ts | 83 | طب الطوارئ للأطفال |
| src/constants/specialties.ts | 83 | الرعاية الطارئة المتخصصة للأطفال |
| src/constants/specialties.ts | 87 | تحليل صورة دم كاملة |
| src/constants/specialties.ts | 87 | 4 ساعات |
| src/constants/specialties.ts | 87 | قياس مكونات الدم الأساسية والكشف عن فقر الدم والعدوى |
| src/constants/specialties.ts | 88 | سكر الدم صائم |
| src/constants/specialties.ts | 88 | 2 ساعات |
| src/constants/specialties.ts | 88 | قياس مستوى السكر في الدم أثناء الصيام |
| src/constants/specialties.ts | 89 | السكر التراكمي |
| src/constants/specialties.ts | 89 | 6 ساعات |
| src/constants/specialties.ts | 89 | قياس متوسط مستوى السكر في الدم خلال 3 أشهر |
| src/constants/specialties.ts | 90 | تحليل دهون شامل |
| src/constants/specialties.ts | 90 | 6 ساعات |
| src/constants/specialties.ts | 90 | قياس الكوليسترول والدهون الثلاثية في الدم |
| src/constants/specialties.ts | 91 | وظائف الغدة الدرقية |
| src/constants/specialties.ts | 91 | 8 ساعات |
| src/constants/specialties.ts | 91 | قياس هرمونات الغدة الدرقية TSH و T3 و T4 |
| src/constants/specialties.ts | 92 | وظائف الكبد |
| src/constants/specialties.ts | 92 | 6 ساعات |
| src/constants/specialties.ts | 92 | تقييم وظائف الكبد وقياس الإنزيمات الكبدية |
| src/constants/specialties.ts | 93 | وظائف الكلى |
| src/constants/specialties.ts | 93 | 6 ساعات |
| src/constants/specialties.ts | 93 | تقييم وظائف الكلى وقياس الكرياتينين واليوريا |
| src/constants/specialties.ts | 94 | تحليل بول كامل |
| src/constants/specialties.ts | 94 | 3 ساعات |
| src/constants/specialties.ts | 94 | فحص البول للكشف عن أمراض الكلى والمسالك البولية |
| src/constants/specialties.ts | 95 | مزرعة بول |
| src/constants/specialties.ts | 95 | 48 ساعة |
| src/constants/specialties.ts | 95 | الكشف عن البكتيريا المسببة لالتهابات المسالك البولية |
| src/constants/specialties.ts | 96 | فيتامين د |
| src/constants/specialties.ts | 96 | 8 ساعات |
| src/constants/specialties.ts | 96 | قياس مستوى فيتامين د في الدم |
| src/constants/specialties.ts | 97 | فيتامين ب12 |
| src/constants/specialties.ts | 97 | 8 ساعات |
| src/constants/specialties.ts | 97 | قياس مستوى فيتامين ب12 في الدم |
| src/constants/specialties.ts | 98 | دراسة الحديد |
| src/constants/specialties.ts | 98 | 6 ساعات |
| src/constants/specialties.ts | 98 | قياس مستوى الحديد ومخزون الحديد (الفيريتين) |
| src/constants/specialties.ts | 99 | بروتين سي التفاعلي |
| src/constants/specialties.ts | 99 | 4 ساعات |
| src/constants/specialties.ts | 99 | مؤشر الالتهاب في الجسم |
| src/constants/specialties.ts | 100 | سرعة الترسيب |
| src/constants/specialties.ts | 100 | 2 ساعات |
| src/constants/specialties.ts | 100 | قياس سرعة ترسيب كريات الدم الحمراء |
| src/constants/specialties.ts | 101 | مستضد البروستات |
| src/constants/specialties.ts | 101 | 8 ساعات |
| src/constants/specialties.ts | 101 | فحص للكشف المبكر عن أمراض البروستات |
| src/constants/specialties.ts | 102 | هرمون التستوستيرون |
| src/constants/specialties.ts | 102 | 12 ساعة |
| src/constants/specialties.ts | 102 | قياس مستوى هرمون الذكورة |
| src/constants/specialties.ts | 103 | هرمون الإستروجين |
| src/constants/specialties.ts | 103 | 12 ساعة |
| src/constants/specialties.ts | 103 | قياس مستوى هرمون الأنوثة |
| src/constants/specialties.ts | 104 | فحص الحمل (دم) |
| src/constants/specialties.ts | 104 | 4 ساعات |
| src/constants/specialties.ts | 104 | الكشف عن الحمل عبر تحليل الدم |
| src/constants/specialties.ts | 105 | اختبارات التجلط |
| src/constants/specialties.ts | 105 | 6 ساعات |
| src/constants/specialties.ts | 105 | قياس قدرة الدم على التجلط (PT, INR, aPTT) |
| src/constants/specialties.ts | 106 | فصيلة الدم |
| src/constants/specialties.ts | 106 | 2 ساعات |
| src/constants/specialties.ts | 106 | تحديد فصيلة الدم وعامل الريزوس |
| src/constants/specialties.ts | 107 | فحص التهاب الكبد ب |
| src/constants/specialties.ts | 107 | 12 ساعة |
| src/constants/specialties.ts | 107 | الكشف عن فيروس التهاب الكبد الوبائي ب |
| src/constants/specialties.ts | 108 | فحص التهاب الكبد سي |
| src/constants/specialties.ts | 108 | 12 ساعة |
| src/constants/specialties.ts | 108 | الكشف عن فيروس التهاب الكبد الوبائي سي |
| src/constants/specialties.ts | 109 | فحص نقص المناعة |
| src/constants/specialties.ts | 109 | 12 ساعة |
| src/constants/specialties.ts | 109 | الكشف عن فيروس نقص المناعة البشرية |
| src/constants/specialties.ts | 110 | تحليل براز |
| src/constants/specialties.ts | 110 | 4 ساعات |
| src/constants/specialties.ts | 110 | فحص البراز للكشف عن الطفيليات والعدوى |
| src/constants/specialties.ts | 111 | الكالسيوم |
| src/constants/specialties.ts | 111 | 4 ساعات |
| src/constants/specialties.ts | 111 | قياس مستوى الكالسيوم في الدم |
| src/constants/specialties.ts | 112 | الأملاح والشوارد |
| src/constants/specialties.ts | 112 | 4 ساعات |
| src/constants/specialties.ts | 112 | قياس مستوى الصوديوم والبوتاسيوم والكلوريد |
| src/constants/specialties.ts | 113 | حمض البوليك |
| src/constants/specialties.ts | 113 | 4 ساعات |
| src/constants/specialties.ts | 113 | قياس مستوى حمض البوليك للكشف عن النقرس |
| src/constants/specialties.ts | 114 | فحص حساسية شامل |
| src/constants/specialties.ts | 114 | 24 ساعة |
| src/constants/specialties.ts | 114 | فحص شامل لتحديد مسببات الحساسية |
| src/constants/specialties.ts | 115 | مزرعة دم |
| src/constants/specialties.ts | 115 | 72 ساعة |
| src/constants/specialties.ts | 115 | الكشف عن البكتيريا والفطريات في الدم |
| src/constants/specialties.ts | 116 | فحص كوفيد PCR |
| src/constants/specialties.ts | 116 | 12 ساعة |
| src/constants/specialties.ts | 116 | الكشف عن فيروس كورونا المستجد |
| src/constants/specialties.ts | 117 | دلالات الأورام |
| src/constants/specialties.ts | 117 | 24 ساعة |
| src/constants/specialties.ts | 117 | فحص شامل لدلالات الأورام (CEA, CA125, AFP) |
| src/constants/specialties.ts | 118 | فحص جيني ما قبل الزواج |
| src/constants/specialties.ts | 118 | 5 أيام |
| src/constants/specialties.ts | 118 | فحص جيني شامل للكشف عن الأمراض الوراثية |
| src/constants/specialties.ts | 122 | أشعة سينية للصدر |
| src/constants/specialties.ts | 122 | تصوير شعاعي للصدر للكشف عن أمراض الرئة والقلب |
| src/constants/specialties.ts | 123 | أشعة سينية للعظام |
| src/constants/specialties.ts | 123 | تصوير شعاعي للعظام للكشف عن الكسور والإصابات |
| src/constants/specialties.ts | 124 | سونار البطن |
| src/constants/specialties.ts | 124 | تصوير بالموجات فوق الصوتية لأعضاء البطن |
| src/constants/specialties.ts | 125 | سونار الحمل |
| src/constants/specialties.ts | 125 | متابعة الحمل والجنين بالموجات فوق الصوتية |
| src/constants/specialties.ts | 126 | سونار الغدة الدرقية |
| src/constants/specialties.ts | 126 | تصوير الغدة الدرقية بالموجات فوق الصوتية |
| src/constants/specialties.ts | 127 | أشعة مقطعية للدماغ |
| src/constants/specialties.ts | 127 | تصوير مقطعي محوسب للدماغ |
| src/constants/specialties.ts | 128 | أشعة مقطعية للصدر |
| src/constants/specialties.ts | 128 | تصوير مقطعي محوسب للصدر والرئتين |
| src/constants/specialties.ts | 129 | أشعة مقطعية للبطن |
| src/constants/specialties.ts | 129 | تصوير مقطعي محوسب لأعضاء البطن والحوض |
| src/constants/specialties.ts | 130 | رنين مغناطيسي للدماغ |
| src/constants/specialties.ts | 130 | تصوير بالرنين المغناطيسي للدماغ والأعصاب |
| src/constants/specialties.ts | 131 | رنين مغناطيسي للعمود الفقري |
| src/constants/specialties.ts | 131 | تصوير بالرنين المغناطيسي للعمود الفقري |
| src/constants/specialties.ts | 132 | رنين مغناطيسي للركبة |
| src/constants/specialties.ts | 132 | تصوير بالرنين المغناطيسي لمفصل الركبة |
| src/constants/specialties.ts | 133 | تصوير الثدي (ماموغرام) |
| src/constants/specialties.ts | 133 | فحص الثدي بالأشعة للكشف المبكر عن الأورام |
| src/constants/specialties.ts | 134 | فحص هشاشة العظام |
| src/constants/specialties.ts | 134 | قياس كثافة العظام للكشف عن هشاشة العظام |
| src/constants/specialties.ts | 135 | إيكو القلب |
| src/constants/specialties.ts | 135 | تصوير القلب بالموجات فوق الصوتية |
| src/constants/specialties.ts | 136 | دوبلر الأوعية الدموية |
| src/constants/specialties.ts | 136 | تصوير الأوعية الدموية بالدوبلر الملون |
| src/constants/specialties.ts | 137 | أشعة بانورامية للأسنان |
| src/constants/specialties.ts | 137 | تصوير بانورامي شامل للفكين والأسنان |
| src/constants/specialties.ts | 138 | PET-CT تصوير مقطعي بالإصدار البوزيتروني |
| src/constants/specialties.ts | 138 | تصوير متقدم للكشف عن الأورام وتقييم انتشارها |
| src/constants/specialties.ts | 142 | حقن عضلية |
| src/constants/specialties.ts | 142 | إعطاء الحقن العضلية في المنزل بأمان |
| src/constants/specialties.ts | 142 | 15 دقيقة |
| src/constants/specialties.ts | 143 | تغيير الضمادات والجروح |
| src/constants/specialties.ts | 143 | تنظيف وتغيير ضمادات الجروح بشكل احترافي |
| src/constants/specialties.ts | 143 | 30 دقيقة |
| src/constants/specialties.ts | 144 | تركيب كانيولا ومحاليل |
| src/constants/specialties.ts | 144 | تركيب الكانيولا الوريدية وإعطاء المحاليل |
| src/constants/specialties.ts | 144 | 45 دقيقة |
| src/constants/specialties.ts | 145 | رعاية كبار السن |
| src/constants/specialties.ts | 145 | رعاية شاملة لكبار السن تشمل المراقبة والنظافة |
| src/constants/specialties.ts | 145 | 120 دقيقة |
| src/constants/specialties.ts | 146 | سحب عينات دم |
| src/constants/specialties.ts | 146 | سحب عينات دم منزلية للتحاليل المخبرية |
| src/constants/specialties.ts | 146 | 15 دقيقة |
| src/constants/specialties.ts | 147 | إعطاء الأدوية |
| src/constants/specialties.ts | 147 | إعطاء الأدوية الموصوفة والتأكد من الجرعات |
| src/constants/specialties.ts | 147 | 20 دقيقة |
| src/constants/specialties.ts | 148 | مراقبة العلامات الحيوية |
| src/constants/specialties.ts | 148 | قياس ومراقبة الضغط والنبض والحرارة والأكسجين |
| src/constants/specialties.ts | 148 | 30 دقيقة |
| src/constants/specialties.ts | 149 | علاج تنفسي وبخار |
| src/constants/specialties.ts | 149 | جلسات العلاج التنفسي والبخار (نيبولايزر) |
| src/constants/specialties.ts | 149 | 45 دقيقة |
| src/constants/specialties.ts | 150 | تركيب قسطرة بولية |
| src/constants/specialties.ts | 150 | تركيب أو تغيير القسطرة البولية بشكل آمن |
| src/constants/specialties.ts | 150 | 30 دقيقة |
| src/constants/specialties.ts | 151 | رعاية ما بعد العمليات |
| src/constants/specialties.ts | 151 | متابعة المريض بعد العمليات الجراحية في المنزل |
| src/constants/specialties.ts | 151 | 60 دقيقة |
| src/constants/specialties.ts | 152 | رعاية الأم والمولود |
| src/constants/specialties.ts | 152 | رعاية الأم بعد الولادة والعناية بالمولود |
| src/constants/specialties.ts | 152 | 90 دقيقة |
| src/constants/specialties.ts | 153 | قياس السكر والضغط |
| src/constants/specialties.ts | 153 | قياس مستوى السكر وضغط الدم المنزلي |
| src/constants/specialties.ts | 153 | 15 دقيقة |
| src/constants/specialties.ts | 154 | حقن وريدي |
| src/constants/specialties.ts | 154 | إعطاء الأدوية والمضادات الحيوية عبر الوريد |
| src/constants/specialties.ts | 154 | 30 دقيقة |
| src/constants/specialties.ts | 155 | علاج طبيعي منزلي |
| src/constants/specialties.ts | 155 | جلسات علاج طبيعي منزلية لتأهيل العضلات والمفاصل |
| src/constants/specialties.ts | 155 | 60 دقيقة |
| src/constants/specialties.ts | 156 | تغذية وريدية |
| src/constants/specialties.ts | 156 | تحضير وإعطاء التغذية الوريدية للمرضى |
| src/constants/specialties.ts | 156 | 120 دقيقة |
| src/constants/specialties.ts | 157 | العناية بالأنبوب الأنفي المعدي |
| src/constants/specialties.ts | 157 | تركيب وصيانة أنبوب التغذية الأنفي المعدي |
| src/constants/specialties.ts | 157 | 30 دقيقة |
| src/constants/specialties.ts | 158 | العناية بفغر القصبة الهوائية |
| src/constants/specialties.ts | 158 | تنظيف وتغيير أنبوب فغر القصبة الهوائية |
| src/constants/specialties.ts | 158 | 45 دقيقة |
| src/constants/specialties.ts | 159 | تخطيط قلب منزلي |
| src/constants/specialties.ts | 159 | عمل تخطيط القلب الكهربائي في المنزل |
| src/constants/specialties.ts | 159 | 30 دقيقة |
| src/constants/specialties.ts | 160 | حقنة شرجية |
| src/constants/specialties.ts | 160 | إعطاء الحقنة الشرجية العلاجية في المنزل |
| src/constants/specialties.ts | 160 | 30 دقيقة |
| src/constants/specialties.ts | 161 | إزالة الغرز الجراحية |
| src/constants/specialties.ts | 161 | إزالة الغرز الجراحية بعد التعافي الكافي |
| src/constants/specialties.ts | 161 | 20 دقيقة |
| src/constants/specialties.ts | 162 | العناية بقرح الفراش |
| src/constants/specialties.ts | 162 | علاج وتنظيف قرح الفراش لطريحي الفراش |
| src/constants/specialties.ts | 162 | 45 دقيقة |
| src/constants/specialties.ts | 163 | تطعيمات منزلية |
| src/constants/specialties.ts | 163 | إعطاء التطعيمات والتحصينات في المنزل |
| src/constants/specialties.ts | 163 | 15 دقيقة |
| src/context/AppContext.tsx | 26 | العربية |
| src/context/AppContext.tsx | 28 | اردو |
| src/context/ConsultationsContext.tsx | 30 | طبيب |
| src/context/DiagnosticsCartContext.tsx | 54 | السلة مقيدة بمختبر آخر |
| src/context/DiagnosticsCartContext.tsx | 55 | سلتك الحالية تحتوي على فحوصات من مختبر مختلف. هل تريد تفريغ السلة للبدء مع هذا المختبر؟ |
| src/context/DiagnosticsCartContext.tsx | 57 | إلغاء |
| src/context/DiagnosticsCartContext.tsx | 59 | تفريغ السلة والمتابعة |
| src/core/config/ConfigManager.ts | 172 | نبض بلس |
| src/data/fetus-data.ts | 16 | خلية واحدة |
| src/data/fetus-data.ts | 19 | في الأسبوع الأول، تبدأ البويضة المخصبة بالانقسام السريع وتتحرك نحو الرحم. |
| src/data/fetus-data.ts | 24 | مجموعة خلايا (علقة) |
| src/data/fetus-data.ts | 27 | تتكاثر الخلايا وتزرع نفسها في بطانة الرحم السميكة. |
| src/data/fetus-data.ts | 32 | بذرة الخشخاش |
| src/data/fetus-data.ts | 35 | يبدأ الأنبوب العصبي بالتكون، وهو الذي سيصبح لاحقاً الدماغ والحبل الشوكي. |
| src/data/fetus-data.ts | 40 | بذرة السمسم |
| src/data/fetus-data.ts | 43 | يبدأ القلب الصغير بالتشكل والنبض، وتتكون براعم الأطراف الأولى. |
| src/data/fetus-data.ts | 48 | حبة فلفل أسود |
| src/data/fetus-data.ts | 51 | يأخذ الجنين شكل حرف C، وتبدأ ملامح الوجه الأساسية بالظهور. |
| src/data/fetus-data.ts | 56 | حبة عدس |
| src/data/fetus-data.ts | 59 | تتطور براعم الأطراف لتصبح أذرع وسيقان صغيرة، وتبدأ العينان بالتكون. |
| src/data/fetus-data.ts | 64 | حبة توت أزرق |
| src/data/fetus-data.ts | 67 | يتطور الدماغ بسرعة مذهلة، وتبدأ الأعضاء الداخلية بالنمو. |
| src/data/fetus-data.ts | 72 | حبة فاصوليا |
| src/data/fetus-data.ts | 75 | تتكون أصابع اليدين والقدمين الصغيرة، وتستمر الملامح بالتشكل. |
| src/data/fetus-data.ts | 80 | حبة عنب |
| src/data/fetus-data.ts | 83 | تكتمل الأساسيات الجسدية للجنين ويبدأ بالتحرك بنشاط داخل الرحم. |
| src/data/fetus-data.ts | 88 | برقوق مجفف |
| src/data/fetus-data.ts | 91 | ينتهي طور المضغة ويبدأ طور الجنين، وتصبح الأطراف والوجه أكثر وضوحاً. |
| src/data/fetus-data.ts | 96 | حبة ليمون خضراء |
| src/data/fetus-data.ts | 99 | تتكون ملامح الوجه والأذنين بشكل أفضل، وتنمو بصيلات الشعر. |
| src/data/fetus-data.ts | 104 | حبة برقوق |
| src/data/fetus-data.ts | 107 | تتكون الأظافر الرقيقة وتصبح ردود أفعال الجنين أكثر وضوحاً. |
| src/data/fetus-data.ts | 112 | حبة خوخ |
| src/data/fetus-data.ts | 115 | تبدأ بصمات الأصابع الفريدة بالتشكل على أطراف الأصابع. |
| src/data/fetus-data.ts | 120 | حبة ليمون |
| src/data/fetus-data.ts | 123 | يستطيع الجنين الآن تغيير تعابير وجهه والقيام بحركات بسيطة. |
| src/data/fetus-data.ts | 128 | حبة تفاح |
| src/data/fetus-data.ts | 131 | يبدأ الشعر بالنمو على الرأس وتتصلب العظام تدريجياً. |
| src/data/fetus-data.ts | 136 | حبة أفوكادو |
| src/data/fetus-data.ts | 139 | الهيكل العظمي يتضح أكثر، وتصبح العضلات أقوى للقيام بحركات واضحة. |
| src/data/fetus-data.ts | 144 | حبة لفت |
| src/data/fetus-data.ts | 147 | يبدأ تكون الدهون تحت الجلد للحفاظ على درجة حرارة الجنين. |
| src/data/fetus-data.ts | 150 | حبة فلفل حلو |
| src/data/fetus-data.ts | 150 | الأذنان تأخذان مكانهما النهائي، وقد تبدأين بالشعور بحركته. |
| src/data/fetus-data.ts | 151 | حبة طماطم |
| src/data/fetus-data.ts | 151 | يغطي جسم الجنين مادة بيضاء دهنية تحمي بشرته في السائل الأمينوسي. |
| src/data/fetus-data.ts | 152 | موزة |
| src/data/fetus-data.ts | 152 | في منتصف رحلة الحمل، يكسو جسمه شعر دقيق (الزغب) للحماية. |
| src/data/fetus-data.ts | 153 | حبة جزر |
| src/data/fetus-data.ts | 153 | يستمر الجنين بابتلاع السائل الأمينوسي لتدريب جهازه الهضمي. |
| src/data/fetus-data.ts | 154 | قرع صيفي |
| src/data/fetus-data.ts | 154 | تتطور حواسه بشكل ملحوظ، وتصبح ملامح وجهه واضحة ومكتملة. |
| src/data/fetus-data.ts | 155 | مانجو |
| src/data/fetus-data.ts | 155 | يبدأ بالاستجابة للأصوات الخارجية ويسمع نبضات قلبك بوضوح. |
| src/data/fetus-data.ts | 156 | كوز ذرة |
| src/data/fetus-data.ts | 156 | تنمو رئتيه وتستعدان للعمل، وتصبح بشرته مجعدة وتكتسب لوناً. |
| src/data/fetus-data.ts | 157 | قرنبيط |
| src/data/fetus-data.ts | 157 | تتصلب عظام الجنين تدريجياً، ويبدأ بتخزين الدهون تحت الجلد. |
| src/data/fetus-data.ts | 158 | خس أيسبرغ |
| src/data/fetus-data.ts | 158 | يستطيع الجنين الآن فتح وإغلاق عينيه والتمييز بين الضوء والظلام. |
| src/data/fetus-data.ts | 159 | رأس قرنبيط |
| src/data/fetus-data.ts | 159 | يستمر في التدرب على التنفس من خلال استنشاق السائل الأمينوسي. |
| src/data/fetus-data.ts | 160 | باذنجان كبير |
| src/data/fetus-data.ts | 160 | يصل الجنين لكيلوغرام واحد تقريباً، وتزداد حركته قوة ووضوحاً. |
| src/data/fetus-data.ts | 161 | قرع الجوز |
| src/data/fetus-data.ts | 161 | تنمو عضلاته بقوة ويصبح الدماغ أكثر تعقيداً لاستيعاب الحواس. |
| src/data/fetus-data.ts | 162 | ملفوف صغير |
| src/data/fetus-data.ts | 162 | يتناقص الزغب الذي يغطي جسمه، وتستمر الدهون بالتراكم للحماية. |
| src/data/fetus-data.ts | 163 | حبة جوز الهند |
| src/data/fetus-data.ts | 163 | يبدأ الجنين باتخاذ وضعية الولادة المقلوبة تدريجياً استعداداً. |
| src/data/fetus-data.ts | 164 | بطيخ أصفر |
| src/data/fetus-data.ts | 164 | تكتمل معظم الأعضاء الحيوية، عدا الرئتين اللتين تستمران بالنضوج. |
| src/data/fetus-data.ts | 165 | أناناس |
| src/data/fetus-data.ts | 165 | جهازه المناعي يصبح أقوى بفضل الأجسام المضادة التي تصله منكِ. |
| src/data/fetus-data.ts | 166 | شمام |
| src/data/fetus-data.ts | 166 | يضيق المساحة داخل الرحم وتصبح حركاته أكثر كتداً بدلاً من الركل. |
| src/data/fetus-data.ts | 167 | بطيخة صغيرة |
| src/data/fetus-data.ts | 167 | يكتسب المزيد من الوزن بسرعة، ويصل الكبد والكلى لعملهما الكامل. |
| src/data/fetus-data.ts | 168 | رأس خس روماني |
| src/data/fetus-data.ts | 168 | يستقر في وضعية الولادة النهائية أسفل الحوض، ويستعد للقائك. |
| src/data/fetus-data.ts | 169 | سلق سويسري |
| src/data/fetus-data.ts | 169 | يعتبر الحمل كاملاً الآن، وتكون الرئتان مستعدتين للتنفس الخارجي. |
| src/data/fetus-data.ts | 170 | قرع شتوي |
| src/data/fetus-data.ts | 170 | تنمو أظافره لتصل إلى حافة أصابعه، وتتساقط معظم مادة الطلاء الدهني. |
| src/data/fetus-data.ts | 171 | بطيخة حمراء |
| src/data/fetus-data.ts | 171 | جسمه مكتمل ومستعد للحياة خارج الرحم، ويبني طبقات الدهون النهائية. |
| src/data/fetus-data.ts | 172 | يقطينة صغيرة |
| src/data/fetus-data.ts | 172 | اكتمل نمو جنينك تماماً! وهو الآن مستعد للخروج ورؤية العالم. |
| src/design-system/components/Avatar.tsx | 112 | صورة المستخدم |
| src/design-system/components/Avatar.tsx | 150 | متصل |
| src/design-system/components/Avatar.tsx | 150 | غير متصل |
| src/design-system/components/Badge.tsx | 59 | إشعار جديد |
| src/design-system/components/Badge.tsx | 80 | ${displayCount} إشعار |
| src/design-system/components/Badge.tsx | 157 | إزالة ${label} |
| src/design-system/components/BottomSheet.tsx | 179 | اسحب لأسفل للإغلاق |
| src/design-system/components/BottomSheet.tsx | 180 | اسحب للأسفل لإغلاق هذه الورقة |
| src/design-system/components/Input.tsx | 158 | إخفاء كلمة المرور |
| src/design-system/components/Input.tsx | 158 | إظهار كلمة المرور |
| src/design-system/components/Loading.tsx | 31 | جارٍ التحميل |
| src/design-system/components/Loading.tsx | 61 | جارٍ التحميل |
| src/design-system/components/OTPInput.tsx | 131 | رقم OTP ${index + 1} من ${length} |
| src/design-system/components/SearchBar.tsx | 65 | ابحث هنا... |
| src/design-system/components/SearchBar.tsx | 67 | یہاں تلاش کریں... |
| src/design-system/components/SearchBar.tsx | 160 | حقل البحث |
| src/design-system/components/SearchBar.tsx | 161 | اكتب للبحث |
| src/design-system/components/SearchBar.tsx | 174 | مسح |
| src/design-system/components/SearchBar.tsx | 186 | البحث الصوتي |
| src/design-system/components/SearchBar.tsx | 204 | فلاتر نشطة |
| src/design-system/components/SearchBar.tsx | 204 | فتح الفلاتر |
| src/design-system/components/SearchBar.tsx | 221 | إلغاء |
| src/design-system/components/SearchBar.tsx | 225 | إلغاء |
| src/design-system/components/SearchBar.tsx | 225 | منسوخ |
| src/design-system/components/States.tsx | 129 | حدث خطأ ما |
| src/design-system/components/States.tsx | 129 | يرجى المحاولة مرة أخرى |
| src/design-system/components/States.tsx | 130 | لا يوجد اتصال |
| src/design-system/components/States.tsx | 130 | تحقق من اتصالك بالإنترنت وأعد المحاولة |
| src/design-system/components/States.tsx | 131 | لم يتم العثور على المحتوى |
| src/design-system/components/States.tsx | 131 | الصفحة التي تبحث عنها غير موجودة |
| src/design-system/components/States.tsx | 132 | غير مصرح لك |
| src/design-system/components/States.tsx | 132 | ليس لديك صلاحية الوصول لهذا المحتوى |
| src/design-system/components/States.tsx | 133 | خطأ في الخادم |
| src/design-system/components/States.tsx | 133 | نعتذر، يرجى المحاولة بعد قليل |
| src/design-system/components/States.tsx | 183 | أعد المحاولة |
| src/design-system/components/States.tsx | 193 | العودة |
| src/design-system/components/Toast.tsx | 254 | إغلاق |
| src/hooks/useGuestGuard.tsx | 63 | مطلوب تسجيل الدخول |
| src/hooks/useGuestGuard.tsx | 65 | يجب تسجيل الدخول للوصول إلى ${feature} |
| src/hooks/useGuestGuard.tsx | 66 | يجب تسجيل الدخول لاستخدام هذه الميزة |
| src/hooks/useGuestGuard.tsx | 68 | إلغاء |
| src/hooks/useGuestGuard.tsx | 70 | تسجيل الدخول |
| src/hooks/useGuestGuard.tsx | 74 | إنشاء حساب |
| src/i18n/index.ts | 27 | الرئيسية |
| src/i18n/index.ts | 27 | استشارات |
| src/i18n/index.ts | 27 | صيدلية |
| src/i18n/index.ts | 27 | تحاليل |
| src/i18n/index.ts | 27 | صحتي |
| src/i18n/index.ts | 28 | الإعدادات |
| src/i18n/index.ts | 28 | حسابي |
| src/i18n/index.ts | 28 | بحث |
| src/i18n/index.ts | 28 | حفظ |
| src/i18n/index.ts | 28 | إلغاء |
| src/i18n/index.ts | 28 | رجوع |
| src/i18n/index.ts | 29 | جاري التحميل... |
| src/i18n/index.ts | 29 | خطأ |
| src/i18n/index.ts | 29 | تم بنجاح |
| src/i18n/index.ts | 29 | إعادة المحاولة |
| src/i18n/index.ts | 29 | تسجيل الخروج |
| src/i18n/index.ts | 30 | تسجيل الدخول |
| src/i18n/index.ts | 30 | إنشاء حساب |
| src/i18n/index.ts | 30 | نسيت كلمة المرور |
| src/i18n/index.ts | 30 | رمز التحقق |
| src/i18n/index.ts | 30 | تصفّح كزائر |
| src/i18n/index.ts | 31 | رقم الهاتف |
| src/i18n/index.ts | 31 | كلمة المرور |
| src/i18n/index.ts | 31 | حساب جديد |
| src/i18n/index.ts | 31 | مرحباً بعودتك |
| src/i18n/index.ts | 32 | صحتي |
| src/i18n/index.ts | 32 | المؤشرات الحيوية |
| src/i18n/index.ts | 32 | أدويتي |
| src/i18n/index.ts | 32 | تقاريري |
| src/i18n/index.ts | 32 | تذكيرات |
| src/i18n/index.ts | 33 | العائلة |
| src/i18n/index.ts | 33 | الأمراض |
| src/i18n/index.ts | 33 | الحساسية |
| src/i18n/index.ts | 34 | السلة |
| src/i18n/index.ts | 34 | أضف للسلة |
| src/i18n/index.ts | 34 | وصفة طبية |
| src/i18n/index.ts | 34 | إعادة الطلب |
| src/i18n/index.ts | 34 | طلباتي |
| src/i18n/index.ts | 35 | طبيب |
| src/i18n/index.ts | 35 | موعد |
| src/i18n/index.ts | 35 | حجز |
| src/i18n/index.ts | 35 | السعر |
| src/i18n/index.ts | 35 | التقييم |
| src/i18n/index.ts | 36 | متاح |
| src/i18n/index.ts | 36 | أونلاين |
| src/i18n/index.ts | 36 | عيادة |
| src/i18n/index.ts | 36 | زيارة منزلية |
| src/i18n/index.ts | 37 | التغذية |
| src/i18n/index.ts | 37 | السعرات |
| src/i18n/index.ts | 37 | التمارين |
| src/i18n/index.ts | 37 | التتبع اليومي |
| src/i18n/index.ts | 37 | خطة الوجبات |
| src/i18n/index.ts | 38 | الصحة النفسية |
| src/i18n/index.ts | 38 | تمارين التنفس |
| src/i18n/index.ts | 38 | تأمل |
| src/i18n/index.ts | 38 | سجل المزاج |
| src/i18n/index.ts | 39 | تمريض منزلي |
| src/i18n/index.ts | 39 | توصيل |
| src/i18n/index.ts | 39 | طوارئ |
| src/i18n/index.ts | 39 | المحفظة |
| src/i18n/index.ts | 39 | التأمين |
| src/i18n/index.ts | 39 | الخريطة |
| src/i18n/index.ts | 39 | المجتمع |
| src/i18n/index.ts | 40 | الإشعارات |
| src/i18n/index.ts | 40 | الدعم الفني |
| src/i18n/index.ts | 40 | الشروط والأحكام |
| src/i18n/index.ts | 40 | عن التطبيق |
| src/i18n/index.ts | 40 | الخصوصية |
| src/i18n/index.ts | 40 | الأمان |
| src/i18n/index.ts | 40 | بياناتي |
| src/i18n/index.ts | 41 | إتمام الشراء |
| src/i18n/index.ts | 41 | تتبع |
| src/i18n/index.ts | 41 | تأكيد |
| src/i18n/index.ts | 41 | رفض |
| src/i18n/index.ts | 41 | قبول |
| src/i18n/index.ts | 41 | رفض |
| src/i18n/index.ts | 42 | محادثة مع الطبيب |
| src/i18n/index.ts | 42 | محادثة مع الصيدلي |
| src/i18n/index.ts | 42 | مكالمة فيديو |
| src/i18n/index.ts | 42 | مكالمة صوتية |
| src/i18n/index.ts | 43 | بطاقاتي |
| src/i18n/index.ts | 43 | إضافة بطاقة |
| src/i18n/index.ts | 43 | طلباتي |
| src/i18n/index.ts | 43 | تتبع الطلب |
| src/i18n/index.ts | 44 | الوضع الداكن |
| src/i18n/index.ts | 44 | الوضع الفاتح |
| src/i18n/index.ts | 44 | وضع النظام |
| src/i18n/index.ts | 44 | اللغة |
| src/i18n/index.ts | 44 | حجم الخط |
| src/i18n/index.ts | 45 | رأي طبي ثاني |
| src/i18n/index.ts | 45 | إحالة طبية |
| src/i18n/index.ts | 45 | ماسح الأدوية |
| src/i18n/index.ts | 45 | تحليل البشرة |
| src/i18n/index.ts | 45 | فحص الأعراض |
| src/i18n/index.ts | 69 | ہوم |
| src/i18n/index.ts | 69 | مشاورت |
| src/i18n/index.ts | 69 | فارمیسی |
| src/i18n/index.ts | 69 | ٹیسٹ |
| src/i18n/index.ts | 69 | میری صحت |
| src/i18n/index.ts | 70 | ترتیبات |
| src/i18n/index.ts | 70 | پروفائل |
| src/i18n/index.ts | 70 | تلاش |
| src/i18n/index.ts | 70 | محفوظ |
| src/i18n/index.ts | 70 | منسوخ |
| src/i18n/index.ts | 70 | واپس |
| src/i18n/index.ts | 71 | لوڈ ہو رہا ہے... |
| src/i18n/index.ts | 71 | خرابی |
| src/i18n/index.ts | 71 | کامیاب |
| src/i18n/index.ts | 71 | دوبارہ |
| src/i18n/index.ts | 71 | لاگ آؤٹ |
| src/i18n/index.ts | 72 | لاگ ان |
| src/i18n/index.ts | 72 | اکاؤنٹ بنائیں |
| src/i18n/index.ts | 72 | پاسورڈ بھول گئے |
| src/i18n/index.ts | 72 | تصدیقی کوڈ |
| src/i18n/index.ts | 72 | مہمان کے طور پر |
| src/i18n/index.ts | 73 | فون نمبر |
| src/i18n/index.ts | 73 | پاسورڈ |
| src/i18n/index.ts | 73 | نیا اکاؤنٹ |
| src/i18n/index.ts | 73 | خوش آمدید |
| src/i18n/index.ts | 74 | میری صحت |
| src/i18n/index.ts | 74 | اہم علامات |
| src/i18n/index.ts | 74 | دوائیں |
| src/i18n/index.ts | 74 | رپورٹس |
| src/i18n/index.ts | 74 | یاد دہانی |
| src/i18n/index.ts | 75 | خاندان |
| src/i18n/index.ts | 75 | بیماریاں |
| src/i18n/index.ts | 75 | الرجی |
| src/i18n/index.ts | 76 | ٹوکری |
| src/i18n/index.ts | 76 | ٹوکری میں ڈالیں |
| src/i18n/index.ts | 76 | نسخہ |
| src/i18n/index.ts | 76 | دوبارہ آرڈر |
| src/i18n/index.ts | 76 | آرڈرز |
| src/i18n/index.ts | 77 | ڈاکٹر |
| src/i18n/index.ts | 77 | ملاقات |
| src/i18n/index.ts | 77 | بکنگ |
| src/i18n/index.ts | 77 | قیمت |
| src/i18n/index.ts | 77 | درجہ بندی |
| src/i18n/index.ts | 78 | دستیاب |
| src/i18n/index.ts | 78 | آن لائن |
| src/i18n/index.ts | 78 | کلینک |
| src/i18n/index.ts | 78 | گھر کا دورہ |
| src/i18n/index.ts | 79 | غذائیت |
| src/i18n/index.ts | 79 | کیلوریز |
| src/i18n/index.ts | 79 | ورزش |
| src/i18n/index.ts | 79 | روزانہ ٹریکر |
| src/i18n/index.ts | 79 | کھانے کا منصوبہ |
| src/i18n/index.ts | 80 | ذہنی صحت |
| src/i18n/index.ts | 80 | سانس کی مشقیں |
| src/i18n/index.ts | 80 | مراقبہ |
| src/i18n/index.ts | 80 | موڈ جرنل |
| src/i18n/index.ts | 81 | گھریلو نرسنگ |
| src/i18n/index.ts | 81 | ڈیلیوری |
| src/i18n/index.ts | 81 | ایمرجنسی |
| src/i18n/index.ts | 81 | والیٹ |
| src/i18n/index.ts | 81 | انشورنس |
| src/i18n/index.ts | 81 | نقشہ |
| src/i18n/index.ts | 81 | کمیونٹی |
| src/i18n/index.ts | 82 | اطلاعات |
| src/i18n/index.ts | 82 | تعاون |
| src/i18n/index.ts | 82 | شرائط و ضوابط |
| src/i18n/index.ts | 82 | ایپ کے بارے میں |
| src/i18n/index.ts | 82 | رازداری |
| src/i18n/index.ts | 82 | سلامتی |
| src/i18n/index.ts | 82 | میرا ڈیٹا |
| src/i18n/index.ts | 83 | چیک آؤٹ |
| src/i18n/index.ts | 83 | ٹریک |
| src/i18n/index.ts | 83 | تصدیق |
| src/i18n/index.ts | 83 | مسترد |
| src/i18n/index.ts | 83 | قبول |
| src/i18n/index.ts | 83 | انکار |
| src/i18n/index.ts | 84 | ڈاکٹر سے چیٹ |
| src/i18n/index.ts | 84 | فارماسسٹ سے چیٹ |
| src/i18n/index.ts | 84 | ویڈیو کال |
| src/i18n/index.ts | 84 | آڈیو کال |
| src/i18n/index.ts | 85 | میرے کارڈز |
| src/i18n/index.ts | 85 | کارڈ شامل کریں |
| src/i18n/index.ts | 85 | میرے آرڈرز |
| src/i18n/index.ts | 85 | آرڈر ٹریکنگ |
| src/i18n/index.ts | 86 | ڈارک موڈ |
| src/i18n/index.ts | 86 | لائٹ موڈ |
| src/i18n/index.ts | 86 | سسٹم موڈ |
| src/i18n/index.ts | 86 | زبان |
| src/i18n/index.ts | 86 | فونٹ سائز |
| src/i18n/index.ts | 87 | دوسری رائے |
| src/i18n/index.ts | 87 | ریفرل |
| src/i18n/index.ts | 87 | دوا سکینر |
| src/i18n/index.ts | 87 | جلد کا تجزیہ |
| src/i18n/index.ts | 87 | علامات کی جانچ |
| src/i18n/index.ts | 161 | طبيعي |
| src/i18n/index.ts | 161 | طبيعي |
| src/i18n/index.ts | 161 | نارمل |
| src/i18n/index.ts | 162 | متوسط |
| src/i18n/index.ts | 162 | متوسط |
| src/i18n/index.ts | 162 | اعتدال |
| src/i18n/index.ts | 163 | الكل |
| src/i18n/index.ts | 163 | الكل |
| src/i18n/index.ts | 163 | سب |
| src/i18n/index.ts | 164 | الآن |
| src/i18n/index.ts | 164 | الآن |
| src/i18n/index.ts | 164 | اب |
| src/i18n/index.ts | 165 | ر.س |
| src/i18n/index.ts | 165 | ر.س |
| src/i18n/index.ts | 165 | ریال |
| src/i18n/index.ts | 166 | اليوم |
| src/i18n/index.ts | 166 | اليوم |
| src/i18n/index.ts | 166 | آج |
| src/i18n/index.ts | 167 | أمس |
| src/i18n/index.ts | 167 | أمس |
| src/i18n/index.ts | 167 | کل |
| src/i18n/index.ts | 168 | أدوية |
| src/i18n/index.ts | 168 | أدوية |
| src/i18n/index.ts | 168 | ادویات |
| src/i18n/index.ts | 169 | مكتمل |
| src/i18n/index.ts | 169 | مكتمل |
| src/i18n/index.ts | 169 | مکمل |
| src/i18n/index.ts | 170 | جيد |
| src/i18n/index.ts | 170 | جيد |
| src/i18n/index.ts | 170 | اچھا |
| src/i18n/index.ts | 171 | الإجمالي |
| src/i18n/index.ts | 171 | الإجمالي |
| src/i18n/index.ts | 171 | کل رقم |
| src/i18n/index.ts | 172 | الوزن |
| src/i18n/index.ts | 172 | الوزن |
| src/i18n/index.ts | 172 | وزن |
| src/i18n/index.ts | 173 | عرض الكل |
| src/i18n/index.ts | 173 | عرض الكل |
| src/i18n/index.ts | 173 | سب دیکھیں |
| src/i18n/index.ts | 174 | أطفال |
| src/i18n/index.ts | 174 | أطفال |
| src/i18n/index.ts | 174 | بچے |
| src/i18n/index.ts | 175 | العربية |
| src/i18n/index.ts | 175 | العربية |
| src/i18n/index.ts | 175 | عربی |
| src/i18n/index.ts | 176 | طريقة الدفع |
| src/i18n/index.ts | 176 | طريقة الدفع |
| src/i18n/index.ts | 176 | طریقہ ادائیگی |
| src/i18n/index.ts | 177 | تأمين |
| src/i18n/index.ts | 177 | تأمين |
| src/i18n/index.ts | 177 | انشورنس |
| src/i18n/index.ts | 178 | ضغط الدم |
| src/i18n/index.ts | 178 | ضغط الدم |
| src/i18n/index.ts | 178 | بلڈ پریشر |
| src/i18n/index.ts | 179 | ممتاز |
| src/i18n/index.ts | 179 | ممتاز |
| src/i18n/index.ts | 179 | بہترین |
| src/i18n/index.ts | 180 | يونيو |
| src/i18n/index.ts | 180 | يونيو |
| src/i18n/index.ts | 180 | جون |
| src/i18n/index.ts | 180 | جون |
| src/i18n/index.ts | 181 | أنت |
| src/i18n/index.ts | 181 | أنت |
| src/i18n/index.ts | 181 | آپ |
| src/i18n/index.ts | 182 | استشارة طبية |
| src/i18n/index.ts | 182 | استشارة طبية |
| src/i18n/index.ts | 182 | طبی مشاورت |
| src/i18n/index.ts | 183 | تغيير |
| src/i18n/index.ts | 183 | تغيير |
| src/i18n/index.ts | 183 | تبدیل |
| src/i18n/index.ts | 183 | بدلیں |
| src/i18n/index.ts | 184 | تمريض |
| src/i18n/index.ts | 184 | تمريض |
| src/i18n/index.ts | 184 | نرسنگ |
| src/i18n/index.ts | 185 | قلب |
| src/i18n/index.ts | 185 | قلب |
| src/i18n/index.ts | 185 | دل |
| src/i18n/index.ts | 186 | احجز الآن |
| src/i18n/index.ts | 186 | احجز الآن |
| src/i18n/index.ts | 186 | ابھی بک کریں |
| src/i18n/index.ts | 187 | الخيارات |
| src/i18n/index.ts | 187 | الخيارات |
| src/i18n/index.ts | 187 | اختیارات |
| src/i18n/index.ts | 188 | سبب آخر |
| src/i18n/index.ts | 188 | سبب آخر |
| src/i18n/index.ts | 188 | دوسری وجہ |
| src/i18n/index.ts | 189 | إلغاء الموعد |
| src/i18n/index.ts | 189 | إلغاء الموعد |
| src/i18n/index.ts | 189 | ملاقات منسوخ کریں |
| src/i18n/index.ts | 190 | خفيف |
| src/i18n/index.ts | 190 | خفيف |
| src/i18n/index.ts | 190 | ہلکا |
| src/i18n/index.ts | 191 | توصيل |
| src/i18n/index.ts | 191 | توصيل |
| src/i18n/index.ts | 191 | ڈیلیوری |
| src/i18n/index.ts | 192 | بطاقة |
| src/i18n/index.ts | 192 | بطاقة |
| src/i18n/index.ts | 192 | کارڈ |
| src/i18n/index.ts | 193 | المنزل |
| src/i18n/index.ts | 193 | المنزل |
| src/i18n/index.ts | 193 | گھر |
| src/i18n/index.ts | 194 | ضريبة (15%) |
| src/i18n/index.ts | 194 | ضريبة (15%) |
| src/i18n/index.ts | 194 | ٹیکس (15%) |
| src/i18n/index.ts | 195 | قرص |
| src/i18n/index.ts | 195 | قرص |
| src/i18n/index.ts | 195 | گولی |
| src/i18n/index.ts | 196 | بعد الأكل |
| src/i18n/index.ts | 196 | بعد الأكل |
| src/i18n/index.ts | 196 | کھانے کے بعد |
| src/i18n/index.ts | 197 | كغ |
| src/i18n/index.ts | 197 | كغ |
| src/i18n/index.ts | 197 | کلو |
| src/i18n/index.ts | 198 | ذكر |
| src/i18n/index.ts | 198 | ذكر |
| src/i18n/index.ts | 198 | مرد |
| src/i18n/index.ts | 199 | الثلاثاء |
| src/i18n/index.ts | 199 | الثلاثاء |
| src/i18n/index.ts | 199 | منگل |
| src/i18n/index.ts | 200 | الأربعاء |
| src/i18n/index.ts | 200 | الأربعاء |
| src/i18n/index.ts | 200 | بدھ |
| src/i18n/index.ts | 201 | السبت |
| src/i18n/index.ts | 201 | السبت |
| src/i18n/index.ts | 201 | ہفتہ |
| src/i18n/index.ts | 202 | الأحد |
| src/i18n/index.ts | 202 | الأحد |
| src/i18n/index.ts | 202 | اتوار |
| src/i18n/index.ts | 203 | نفسية |
| src/i18n/index.ts | 203 | نفسية |
| src/i18n/index.ts | 203 | ذہنی صحت |
| src/i18n/index.ts | 204 | جلدية |
| src/i18n/index.ts | 204 | جلدية |
| src/i18n/index.ts | 204 | جلد |
| src/i18n/index.ts | 205 | أسنان |
| src/i18n/index.ts | 205 | أسنان |
| src/i18n/index.ts | 205 | دانت |
| src/i18n/index.ts | 206 | استشاري |
| src/i18n/index.ts | 206 | استشاري |
| src/i18n/index.ts | 206 | مشیر |
| src/i18n/index.ts | 207 | مرفوض |
| src/i18n/index.ts | 207 | مرفوض |
| src/i18n/index.ts | 207 | مسترد |
| src/i18n/index.ts | 208 | أكسا |
| src/i18n/index.ts | 208 | أكسا |
| src/i18n/index.ts | 208 | اکسا |
| src/i18n/index.ts | 209 | منخفض |
| src/i18n/index.ts | 209 | منخفض |
| src/i18n/index.ts | 209 | کم |
| src/i18n/index.ts | 210 | قيد المراجعة |
| src/i18n/index.ts | 210 | قيد المراجعة |
| src/i18n/index.ts | 210 | زیر غور |
| src/i18n/index.ts | 211 | دهون |
| src/i18n/index.ts | 211 | دهون |
| src/i18n/index.ts | 211 | چربی |
| src/i18n/index.ts | 212 | بروتين |
| src/i18n/index.ts | 212 | بروتين |
| src/i18n/index.ts | 212 | پروٹین |
| src/i18n/index.ts | 213 | محفظة نبض |
| src/i18n/index.ts | 213 | محفظة نبض |
| src/i18n/index.ts | 213 | نبض والیٹ |
| src/i18n/index.ts | 214 | تأكيد الحجز |
| src/i18n/index.ts | 214 | تأكيد الحجز |
| src/i18n/index.ts | 214 | بکنگ की تصدیق |
| src/i18n/index.ts | 215 | العودة للصيدلية |
| src/i18n/index.ts | 215 | العودة للصيدلية |
| src/i18n/index.ts | 215 | فارمیسی پر واپس |
| src/i18n/index.ts | 216 | الكمية |
| src/i18n/index.ts | 216 | الكمية |
| src/i18n/index.ts | 216 | مقدار |
| src/i18n/index.ts | 217 | ملخص التكلفة |
| src/i18n/index.ts | 217 | ملخص التكلفة |
| src/i18n/index.ts | 217 | لاگت کا خلاصہ |
| src/i18n/index.ts | 218 | يتطلب وصفة |
| src/i18n/index.ts | 218 | يتطلب وصفة |
| src/i18n/index.ts | 218 | نسخہ درکار ہے |
| src/i18n/index.ts | 219 | المحفظة |
| src/i18n/index.ts | 219 | المحفظة |
| src/i18n/index.ts | 219 | والیٹ |
| src/i18n/index.ts | 220 | تأكيد |
| src/i18n/index.ts | 220 | تأكيد |
| src/i18n/index.ts | 220 | تصدیق |
| src/i18n/index.ts | 221 | غير متصل |
| src/i18n/index.ts | 221 | غير متصل |
| src/i18n/index.ts | 221 | آف لائن |
| src/i18n/index.ts | 222 | تفاصيل الطلب |
| src/i18n/index.ts | 222 | تفاصيل الطلب |
| src/i18n/index.ts | 222 | آرڈر کی تفصیلات |
| src/i18n/index.ts | 223 | الخدمة |
| src/i18n/index.ts | 223 | الخدمة |
| src/i18n/index.ts | 223 | سروس |
| src/i18n/index.ts | 224 | زوجة |
| src/i18n/index.ts | 224 | زوجة |
| src/i18n/index.ts | 224 | بیوی |
| src/i18n/index.ts | 225 | الأمراض والحساسية |
| src/i18n/index.ts | 225 | الأمراض والحساسية |
| src/i18n/index.ts | 225 | بیماریاں اور الرجی |
| src/i18n/index.ts | 226 | الطول |
| src/i18n/index.ts | 226 | الطول |
| src/i18n/index.ts | 226 | قد |
| src/i18n/index.ts | 227 | يناير |
| src/i18n/index.ts | 227 | يناير |
| src/i18n/index.ts | 227 | جنوری |
| src/i18n/index.ts | 228 | فبراير |
| src/i18n/index.ts | 228 | فبراير |
| src/i18n/index.ts | 228 | فروری |
| src/i18n/index.ts | 229 | مارس |
| src/i18n/index.ts | 229 | مارس |
| src/i18n/index.ts | 229 | مارچ |
| src/i18n/index.ts | 230 | طوارئ |
| src/i18n/index.ts | 230 | طوارئ |
| src/i18n/index.ts | 230 | ایمرجنسی |
| src/i18n/index.ts | 231 | التمريض المنزلي |
| src/i18n/index.ts | 231 | التمريض المنزلي |
| src/i18n/index.ts | 231 | گھریلو نرسنگ |
| src/i18n/index.ts | 232 | أشعة |
| src/i18n/index.ts | 232 | أشعة |
| src/i18n/index.ts | 232 | ایكسرے |
| src/i18n/index.ts | 233 | وظائف الكبد |
| src/i18n/index.ts | 233 | وظائف الكبد |
| src/i18n/index.ts | 233 | جگر کا ٹیسٹ |
| src/i18n/index.ts | 234 | وظائف الكلى |
| src/i18n/index.ts | 234 | وظائف الكلى |
| src/i18n/index.ts | 234 | گردے کا ٹیسٹ |
| src/i18n/index.ts | 235 | أخصائية |
| src/i18n/index.ts | 235 | أخصائية |
| src/i18n/index.ts | 235 | ماہر |
| src/i18n/index.ts | 236 | استشارة |
| src/i18n/index.ts | 236 | استشارة |
| src/i18n/index.ts | 236 | مشاورت |
| src/i18n/index.ts | 237 | رسالة |
| src/i18n/index.ts | 237 | رسالة |
| src/i18n/index.ts | 237 | پیغام |
| src/i18n/index.ts | 238 | طلب صيدلية |
| src/i18n/index.ts | 238 | طلب صيدلية |
| src/i18n/index.ts | 238 | فارمیسی کا آرڈر |
| src/i18n/index.ts | 239 | صداع |
| src/i18n/index.ts | 239 | صداع |
| src/i18n/index.ts | 239 | سر درد |
| src/i18n/index.ts | 240 | منذ ساعة |
| src/i18n/index.ts | 240 | منذ ساعة |
| src/i18n/index.ts | 240 | ایک گھنٹہ پہلے |
| src/i18n/index.ts | 241 | منذ 3 ساعات |
| src/i18n/index.ts | 241 | منذ 3 ساعات |
| src/i18n/index.ts | 241 | 3 گھنٹے پہلے |
| src/i18n/index.ts | 242 | استشارة قلب |
| src/i18n/index.ts | 242 | استشارة قلب |
| src/i18n/index.ts | 242 | دل کی مشاورت |
| src/i18n/index.ts | 243 | قلب وأوعية |
| src/i18n/index.ts | 243 | قلب وأوعية |
| src/i18n/index.ts | 243 | دل اور رگیں |
| src/i18n/index.ts | 244 | وظائف الغدة الدرقية |
| src/i18n/index.ts | 244 | وظائف الغدة الدرقية |
| src/i18n/index.ts | 244 | تھائرائڈ ٹیسٹ |
| src/i18n/index.ts | 245 | تفاصيل الموعد |
| src/i18n/index.ts | 245 | تفاصيل الموعد |
| src/i18n/index.ts | 245 | ملاقات کی تفصیلات |
| src/i18n/index.ts | 246 | شحن |
| src/i18n/index.ts | 246 | شحن |
| src/i18n/index.ts | 246 | ریچارج |
| src/i18n/index.ts | 247 | تحويل |
| src/i18n/index.ts | 247 | تحويل |
| src/i18n/index.ts | 247 | تحویل |
| src/i18n/index.ts | 248 | كاشباك |
| src/i18n/index.ts | 248 | كاشباك |
| src/i18n/index.ts | 248 | کیش بیک |
| src/i18n/index.ts | 249 | الغداء |
| src/i18n/index.ts | 249 | الغداء |
| src/i18n/index.ts | 249 | دوپہر کا کھانا |
| src/i18n/index.ts | 250 | العشاء |
| src/i18n/index.ts | 250 | العشاء |
| src/i18n/index.ts | 250 | رات کا کھانا |
| src/i18n/index.ts | 251 | تحاليل وأشعة |
| src/i18n/index.ts | 251 | تحاليل وأشعة |
| src/i18n/index.ts | 251 | ٹیسٹ اور ایکسرے |
| src/i18n/index.ts | 252 | أهلاً بك |
| src/i18n/index.ts | 252 | أهلاً بك |
| src/i18n/index.ts | 252 | خوش آمدید |
| src/i18n/index.ts | 253 | كيف يمكننا مساعدتك اليوم؟ |
| src/i18n/index.ts | 253 | كيف يمكننا مساعدتك اليوم؟ |
| src/i18n/index.ts | 253 | آج ہم آپ کی کیا مدد کر سکتے ہیں؟ |
| src/i18n/index.ts | 254 | ابحث عن طبيب، دواء، تحليل... |
| src/i18n/index.ts | 254 | ابحث عن طبيب، دواء، تحليل... |
| src/i18n/index.ts | 254 | ڈاکٹر، دوا، ٹیسٹ تلاش کریں... |
| src/i18n/index.ts | 255 | خصم 30% على الاستشارات |
| src/i18n/index.ts | 255 | خصم 30% على الاستشارات |
| src/i18n/index.ts | 255 | مشاورت پر 30٪ چھوٹ |
| src/i18n/index.ts | 256 | عرض محدود — مختبرات معتمدة |
| src/i18n/index.ts | 256 | عرض محدود — مختبرات معتمدة |
| src/i18n/index.ts | 256 | محدود پیشکش — مصدقہ لیبز |
| src/i18n/index.ts | 257 | استشر طبيبك الآن |
| src/i18n/index.ts | 257 | استشر طبيبك الآن |
| src/i18n/index.ts | 257 | ابھی اپنے داکٹر سے مشورہ کریں |
| src/i18n/index.ts | 258 | أطباء متاحون على مدار الساعة |
| src/i18n/index.ts | 258 | أطباء متاحون على مدار الساعة |
| src/i18n/index.ts | 258 | ڈاکٹرز 24/7 دستیاب ہیں |
| src/i18n/index.ts | 259 | خدماتنا |
| src/i18n/index.ts | 259 | خدماتنا |
| src/i18n/index.ts | 259 | ہماری خدمات |
| src/i18n/index.ts | 260 | عيادات ومستشفيات |
| src/i18n/index.ts | 260 | عيادات ومستشفيات |
| src/i18n/index.ts | 260 | کلینک اور ہسپتال |
| src/i18n/index.ts | 261 | حجز موعد |
| src/i18n/index.ts | 261 | حجز موعد |
| src/i18n/index.ts | 261 | ملاقات بک کریں |
| src/i18n/index.ts | 262 | الملف الطبي |
| src/i18n/index.ts | 262 | الملف الطبي |
| src/i18n/index.ts | 262 | طبی فائل |
| src/i18n/index.ts | 263 | تأكيد الطلب |
| src/i18n/index.ts | 263 | تأكيد الطلب |
| src/i18n/index.ts | 263 | آرڈر की تصدیق |
| src/i18n/index.ts | 264 | إلغاء الطلب |
| src/i18n/index.ts | 264 | إلغاء الطلب |
| src/i18n/index.ts | 264 | آرڈر منسوخ کریں |
| src/i18n/index.ts | 265 | بوبا للتأمين |
| src/i18n/index.ts | 265 | بوبا للتأمين |
| src/i18n/index.ts | 265 | بوبا انشورنس |
| src/i18n/index.ts | 265 | বুপا বীমা |
| src/i18n/index.ts | 266 | تكافل الراجحي |
| src/i18n/index.ts | 266 | تكافل الراجحي |
| src/i18n/index.ts | 266 | الراجحی تکافل |
| src/i18n/index.ts | 267 | ملاذ للتأمين |
| src/i18n/index.ts | 267 | ملاذ للتأمين |
| src/i18n/index.ts | 267 | ملاذ انشورنس |
| src/i18n/index.ts | 268 | الدرع العربي |
| src/i18n/index.ts | 268 | الدرع العربي |
| src/i18n/index.ts | 268 | عرب شیلڈ |
| src/i18n/index.ts | 269 | التعاونية |
| src/i18n/index.ts | 269 | التعاونية |
| src/i18n/index.ts | 269 | التعاونیہ |
| src/i18n/index.ts | 270 | سايكو |
| src/i18n/index.ts | 270 | سايكو |
| src/i18n/index.ts | 270 | سائیکو |
| src/i18n/index.ts | 271 | ميدغلف |
| src/i18n/index.ts | 271 | ميدغلف |
| src/i18n/index.ts | 271 | مڈ گلف |
| src/i18n/index.ts | 272 | بوبا للتأمين (Bupa Arabia) |
| src/i18n/index.ts | 272 | بوبا للتأمين (Bupa Arabia) |
| src/i18n/index.ts | 272 | بوبا عربیہ |
| src/i18n/index.ts | 273 | الدرع العربي (Arabian Shield) |
| src/i18n/index.ts | 273 | الدرع العربي (Arabian Shield) |
| src/i18n/index.ts | 273 | عرب شیلڈ |
| src/i18n/index.ts | 274 | ميدغلف (MedGulf) |
| src/i18n/index.ts | 274 | ميدغلف (MedGulf) |
| src/i18n/index.ts | 274 | مڈ گلف |
| src/i18n/index.ts | 274 | মেডগালف |
| src/i18n/index.ts | 275 | الراجحي تكافل (Al Rajhi Takaful) |
| src/i18n/index.ts | 275 | الراجحي تكافل (Al Rajhi Takaful) |
| src/i18n/index.ts | 275 | الراجحی تکافل |
| src/i18n/index.ts | 276 | أليانز السعودي الفرنسي (Allianz SF) |
| src/i18n/index.ts | 276 | أليانز السعودي الفرنسي (Allianz SF) |
| src/i18n/index.ts | 276 | الیانز سعودی فرانسیسی |
| src/i18n/index.ts | 277 | ولاء للتأمين (Walaa) |
| src/i18n/index.ts | 277 | ولاء للتأمين (Walaa) |
| src/i18n/index.ts | 277 | ولاء انشورنس |
| src/i18n/index.ts | 278 | سلامة للتأمين (Salama) |
| src/i18n/index.ts | 278 | سلامة للتأمين (Salama) |
| src/i18n/index.ts | 278 | سلامہ انشورنس |
| src/i18n/index.ts | 279 | المتوسط والخليج (MEDGULF) |
| src/i18n/index.ts | 279 | المتوسط والخليج (MEDGULF) |
| src/i18n/index.ts | 279 | مڈ گلف |
| src/services/ErrorHandler.tsx | 49 | فشل الاتصال بالشبكة |
| src/services/ErrorHandler.tsx | 52 | انتهت مهلة الطلب |
| src/services/ErrorHandler.tsx | 61 | حدث خطأ غير متوقع |
| src/services/ErrorHandler.tsx | 68 | تحقق من اتصالك بالإنترنت وأعد المحاولة. |
| src/services/ErrorHandler.tsx | 69 | الطلب استغرق وقتاً طويلاً. أعد المحاولة. |
| src/services/ErrorHandler.tsx | 70 | انتهت جلستك. يرجى تسجيل الدخول مجدداً. |
| src/services/ErrorHandler.tsx | 71 | ليس لديك صلاحية لهذا الإجراء. |
| src/services/ErrorHandler.tsx | 72 | لم يتم العثور على المحتوى المطلوب. |
| src/services/ErrorHandler.tsx | 73 | يرجى مراجعة البيانات المدخلة. |
| src/services/ErrorHandler.tsx | 74 | خطأ في الخادم. يرجى المحاولة لاحقاً. |
| src/services/ErrorHandler.tsx | 75 | حدث خطأ غير متوقع. يرجى المحاولة مجدداً. |
| src/services/ErrorHandler.tsx | 76 | أنت غير متصل بالإنترنت. |
| src/services/ErrorHandler.tsx | 77 | تم إلغاء العملية. |
| src/services/ErrorHandler.tsx | 161 | أعد المحاولة |
| src/services/PermissionsManager.ts | 71 | تحقق من هويتك |
| src/services/PermissionsManager.ts | 72 | إلغاء |
| src/services/PermissionsManager.ts | 130 | تفعيل ${title} |
| src/services/PermissionsManager.ts | 131 | يحتاج التطبيق إلى إذن ${title} للمتابعة. |
| src/services/PermissionsManager.ts | 133 | إلغاء |
| src/services/PermissionsManager.ts | 134 | فتح الإعدادات |
| src/services/PermissionsManager.ts | 150 | الكاميرا |
| src/services/PermissionsManager.ts | 151 | الميكروفون |
| src/services/PermissionsManager.ts | 152 | الصور |
| src/services/PermissionsManager.ts | 153 | الموقع |
| src/services/PermissionsManager.ts | 154 | الموقع في الخلفية |
| src/services/PermissionsManager.ts | 155 | الإشعارات |
| src/services/PermissionsManager.ts | 156 | البيومترية |
| src/services/PermissionsManager.ts | 157 | جهات الاتصال |
| src/services/PermissionsManager.ts | 158 | مكتبة الوسائط |

> عناصر هذا الجرد تدخل قاموساً منظماً أو تستبدل بنص صادر من الخادم حسب ملكية النص. لا يجوز استخدام ترجمة آلية غير مراجعة للنصوص الطبية أو القانونية أو المالية.
