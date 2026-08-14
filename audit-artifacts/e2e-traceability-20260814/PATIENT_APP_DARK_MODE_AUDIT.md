# تدقيق الوضع الداكن لتطبيق المريض

**نطاق التحليل:** 477 ملف TS/TSX في app/ وsrc/، باستثناء الأصول وقاموس i18n.
**ملفات تحوي ألواناً صريحة:** 168.
**ملفات بألوان صريحة ولا يظهر بها ربط بالسمة:** 6.
**ملفات ذات أبيض/أسود صريح ولا يظهر بها ربط بالسمة (أولوية إصلاح):** 2.

> هذه نتيجة تحليل ساكن وليست بديلاً عن فحص بصري على أجهزة iOS وAndroid. اللون الصريح ليس عطلاً بذاته: ألوان الهوية، الأيقونات البيضاء فوق خلفية ملونة، والصور قد تكون صحيحة. الأولوية هي الأسطح والنصوص والحدود التي لا تتبدل مع السمة.

## أولوية الإصلاح: أبيض/أسود صريح في ملف غير مربوط بالسمة

| الملف | أبيض/أسود صريح | مجموع الألوان الصريحة | أسطر أولى |
|---|---:|---:|---|
| app/room/[id].tsx | 2 | 5 | 186, 200, 214, 218, 228 |
| src/theme/index.ts | 1 | 6 | 105, 179, 233, 240, 247, 254 |

## جميع الملفات ذات الألوان الصريحة

| الملف | مرتبط بالسمة | أبيض/أسود صريح | مجموع الألوان | أسطر أولى |
|---|---|---:|---:|---|
| app/(tabs)/consultations/index.tsx | نعم | 19 | 20 | 185, 205, 208, 211, 296, 297, 302, 303, 307, 328, 406, 407 |
| app/(tabs)/diagnostics.tsx | نعم | 16 | 23 | 110, 118, 164, 188, 229, 231, 235, 239, 285, 287, 291, 295 |
| app/(tabs)/pharmacy.tsx | نعم | 15 | 33 | 223, 227, 242, 257, 281, 349, 352, 389, 394, 396, 398, 400 |
| app/pharmacy/product-detail.tsx | نعم | 11 | 27 | 175, 180, 183, 203, 229, 237, 238, 242, 243, 268, 272, 298 |
| app/nutrition/ai-meal-planner.tsx | نعم | 9 | 19 | 20, 21, 22, 23, 24, 25, 89, 145, 248, 248, 269, 276 |
| app/ai/symptom-checker.tsx | نعم | 9 | 14 | 670, 786, 816, 854, 869, 881, 885, 946, 951, 1070, 1115, 1119 |
| app/diagnostics/sample-tracking.tsx | نعم | 8 | 11 | 149, 154, 156, 159, 163, 173, 181, 197, 249, 254, 259 |
| app/insurance/coverage-check.tsx | نعم | 8 | 11 | 259, 265, 268, 278, 282, 290, 298, 300, 305, 306, 308 |
| app/loyalty/hub.tsx | نعم | 8 | 10 | 19, 23, 336, 343, 367, 373, 388, 390, 399, 402 |
| app/pharmacy/cart.tsx | نعم | 7 | 31 | 74, 90, 116, 124, 125, 144, 149, 152, 161, 164, 165, 168 |
| app/insurance/payment-split.tsx | نعم | 7 | 24 | 209, 221, 268, 277, 290, 316, 334, 337, 352, 355, 356, 357 |
| app/map/index.tsx | نعم | 7 | 16 | 32, 33, 34, 35, 36, 37, 380, 567, 569, 659, 668, 696 |
| app/ai/monthly-report.tsx | نعم | 7 | 13 | 32, 40, 48, 56, 87, 201, 204, 210, 212, 213, 221, 231 |
| app/wallet/hub.tsx | نعم | 7 | 12 | 264, 270, 273, 290, 291, 296, 299, 300, 309, 320, 322, 323 |
| app/drug-scanner/index.tsx | نعم | 7 | 11 | 159, 200, 218, 225, 228, 241, 244, 245, 247, 258, 262 |
| app/nursing/service-details.tsx | نعم | 6 | 41 | 189, 190, 193, 194, 195, 200, 206, 209, 212, 226, 229, 231 |
| app/(tabs)/nursing.tsx | نعم | 6 | 30 | 220, 224, 224, 225, 225, 226, 230, 230, 231, 232, 233, 234 |
| app/nutrition/food-scanner.tsx | نعم | 6 | 19 | 93, 127, 128, 129, 130, 141, 149, 190, 199, 203, 205, 210 |
| app/pharmacy/order-tracking.tsx | نعم | 6 | 16 | 90, 91, 115, 117, 120, 122, 123, 131, 149, 208, 209, 214 |
| app/pharmacy/broadcast-status.tsx | نعم | 6 | 11 | 82, 148, 153, 195, 227, 231, 234, 237, 245, 253, 261 |
| app/voice/index.tsx | نعم | 6 | 11 | 286, 294, 335, 410, 434, 464, 472, 480, 485, 488, 522 |
| app/(tabs)/index.tsx | نعم | 6 | 10 | 227, 229, 268, 272, 281, 296, 327, 335, 342, 344 |
| app/consultations/doctor/[id].tsx | نعم | 6 | 9 | 156, 242, 243, 361, 365, 450, 451, 452, 459 |
| app/consultations/virtual-waiting-room.tsx | نعم | 6 | 8 | 70, 79, 85, 147, 173, 196, 202, 216 |
| app/consultations/offer/[id].tsx | نعم | 6 | 7 | 95, 107, 138, 147, 233, 234, 248 |
| app/health/trends.tsx | نعم | 6 | 6 | 118, 506, 546, 572, 604, 621 |
| app/mental-health/meditation.tsx | نعم | 6 | 6 | 221, 224, 229, 238, 243, 253 |
| app/nursing/live-tracking.tsx | نعم | 5 | 37 | 104, 107, 108, 110, 110, 111, 113, 114, 117, 118, 121, 122 |
| app/returns/new-request.tsx | نعم | 5 | 17 | 19, 20, 21, 22, 23, 192, 218, 268, 275, 296, 300, 307 |
| app/settings/help.tsx | نعم | 5 | 14 | 19, 20, 21, 22, 23, 24, 67, 73, 79, 177, 199, 226 |
| app/insurance/hub.tsx | نعم | 5 | 13 | 74, 75, 76, 77, 99, 486, 491, 494, 496, 502, 504, 505 |
| app/health/wearables.tsx | نعم | 5 | 12 | 15, 16, 17, 18, 19, 20, 166, 169, 172, 186, 196, 199 |
| app/ai/skin-analysis.tsx | نعم | 5 | 11 | 21, 218, 221, 253, 282, 289, 291, 310, 312, 325, 326 |
| app/nursing/live-doctor-tracking.tsx | نعم | 5 | 10 | 63, 81, 90, 116, 122, 124, 124, 127, 129, 130 |
| app/consultations/home-visit-tracking.tsx | نعم | 5 | 6 | 36, 37, 90, 100, 101, 112 |
| app/emergency/tracking.tsx | نعم | 5 | 6 | 93, 114, 117, 118, 129, 131 |
| app/maternity/hub.tsx | نعم | 5 | 5 | 554, 563, 577, 596, 613 |
| app/mental-health/crisis-support.tsx | نعم | 4 | 16 | 68, 73, 94, 111, 141, 155, 158, 159, 160, 162, 164, 166 |
| app/health/health-id.tsx | نعم | 4 | 14 | 108, 192, 205, 207, 207, 208, 216, 216, 217, 219, 221, 222 |
| app/health/smart-reminders.tsx | نعم | 4 | 14 | 31, 32, 33, 34, 35, 36, 40, 41, 42, 149, 187, 192 |
| app/mental-health/self-assessment.tsx | نعم | 4 | 12 | 37, 38, 39, 40, 117, 126, 126, 148, 154, 155, 161, 168 |
| app/health/sleep-tracker.tsx | نعم | 4 | 11 | 13, 14, 15, 16, 59, 61, 139, 144, 146, 149, 150 |
| app/health/prescriptions.tsx | نعم | 4 | 10 | 72, 84, 89, 101, 116, 121, 123, 130, 133, 138 |
| app/(onboarding)/index.tsx | نعم | 4 | 7 | 114, 227, 269, 272, 278, 292, 309 |
| app/consultations/video-call.tsx | نعم | 4 | 7 | 172, 178, 182, 192, 200, 204, 217 |
| app/maternity/baby-development.tsx | نعم | 4 | 6 | 471, 568, 570, 578, 584, 596 |
| app/(auth)/welcome.tsx | نعم | 4 | 5 | 97, 146, 188, 237, 258 |
| app/insurance/benefits-summary.tsx | نعم | 4 | 5 | 131, 138, 140, 141, 158 |
| app/consultations/booking-success.tsx | نعم | 4 | 4 | 150, 274, 282, 333 |
| app/diagnostics/cart.tsx | نعم | 4 | 4 | 59, 191, 213, 222 |
| app/payments/success.tsx | نعم | 4 | 4 | 94, 95, 97, 105 |
| app/reviews/index.tsx | نعم | 4 | 4 | 209, 222, 240, 298 |
| app/nursing/nurse-profile.tsx | نعم | 3 | 71 | 263, 277, 337, 340, 340, 342, 342, 344, 345, 347, 348, 349 |
| app/pharmacy/filters.tsx | نعم | 3 | 16 | 17, 18, 19, 20, 67, 68, 69, 70, 71, 72, 80, 154 |
| app/pharmacy/order-confirm.tsx | نعم | 3 | 14 | 84, 85, 108, 136, 142, 142, 143, 144, 145, 164, 171, 181 |
| app/mental-health/mood-journal.tsx | نعم | 3 | 12 | 13, 14, 15, 16, 17, 110, 110, 123, 123, 189, 192, 206 |
| app/pharmacy/scan-prescription.tsx | نعم | 3 | 11 | 154, 158, 169, 180, 195, 200, 204, 243, 273, 289, 356 |
| app/diagnostics/insurance-approval.tsx | نعم | 3 | 10 | 93, 94, 95, 174, 175, 203, 204, 246, 265, 285 |
| app/payments/processing.tsx | نعم | 3 | 8 | 263, 329, 367, 432, 469, 486, 507, 528 |
| app/consultations/appointments.tsx | نعم | 3 | 7 | 28, 29, 30, 31, 367, 371, 431 |
| app/(auth)/register.tsx | نعم | 3 | 6 | 266, 275, 276, 309, 346, 379 |
| app/health/sleep-score.tsx | نعم | 3 | 6 | 94, 95, 96, 155, 165, 167 |
| src/components/Header.tsx | نعم | 3 | 6 | 43, 95, 133, 165, 215, 217 |
| app/consultations/waiting-room.tsx | نعم | 3 | 5 | 105, 106, 110, 230, 244 |
| app/diagnostics/booking-success.tsx | نعم | 3 | 5 | 49, 89, 94, 109, 113 |
| app/diagnostics/lab/[id].tsx | نعم | 3 | 5 | 99, 132, 134, 138, 142 |
| app/settings/security.tsx | نعم | 3 | 5 | 319, 367, 390, 392, 402 |
| app/community/live-session.tsx | نعم | 3 | 4 | 104, 119, 121, 139 |
| app/diagnostics/insurance-upload.tsx | نعم | 3 | 4 | 135, 166, 292, 340 |
| app/consultations/appointment-detail.tsx | نعم | 3 | 3 | 212, 214, 241 |
| app/insurance/copay.tsx | نعم | 3 | 3 | 91, 102, 105 |
| app/loyalty/challenges.tsx | نعم | 3 | 3 | 164, 166, 180 |
| app/payments/failed.tsx | نعم | 3 | 3 | 108, 122, 148 |
| app/pharmacy/pharmacist-chat.tsx | نعم | 3 | 3 | 241, 290, 358 |
| app/insurance/claim-tracking.tsx | نعم | 2 | 11 | 14, 15, 16, 17, 18, 48, 106, 113, 130, 136, 151 |
| app/nutrition/log-meal.tsx | نعم | 2 | 10 | 89, 89, 102, 109, 128, 145, 176, 185, 196, 206 |
| app/diagnostics/order/[id].tsx | نعم | 2 | 9 | 118, 178, 259, 276, 285, 288, 289, 299, 299 |
| app/settings/data.tsx | نعم | 2 | 8 | 39, 46, 53, 60, 84, 168, 177, 212 |
| app/consultations/cancel-reschedule.tsx | نعم | 2 | 7 | 58, 59, 60, 100, 177, 185, 188 |
| app/pharmacy/payment.tsx | نعم | 2 | 7 | 100, 103, 105, 107, 142, 161, 162 |
| app/support/chat.tsx | نعم | 2 | 7 | 163, 200, 221, 261, 272, 289, 297 |
| app/pharmacy/checkout.tsx | نعم | 2 | 6 | 160, 169, 177, 254, 255, 277 |
| app/(auth)/login.tsx | نعم | 2 | 5 | 285, 286, 329, 366, 399 |
| app/ai/chat-doctor.tsx | نعم | 2 | 5 | 244, 244, 246, 255, 263 |
| app/loyalty/leaderboard.tsx | نعم | 2 | 5 | 139, 156, 172, 243, 269 |
| app/room/[id].tsx | لا | 2 | 5 | 186, 200, 214, 218, 228 |
| app/diagnostics/checkout.tsx | نعم | 2 | 4 | 130, 132, 274, 305 |
| app/health/reports.tsx | نعم | 2 | 4 | 58, 94, 96, 104 |
| app/pharmacy/wishlist.tsx | نعم | 2 | 4 | 91, 118, 179, 186 |
| app/settings/feedback.tsx | نعم | 2 | 4 | 64, 124, 197, 233 |
| app/insurance/add-policy.tsx | نعم | 2 | 3 | 105, 125, 137 |
| app/insurance/policy-detail.tsx | نعم | 2 | 3 | 110, 133, 135 |
| app/pharmacy/custom-item.tsx | نعم | 2 | 3 | 278, 287, 329 |
| src/components/BottomNavBar.tsx | نعم | 2 | 3 | 63, 122, 154 |
| app/consultations/chat-with-doctor.tsx | نعم | 2 | 2 | 129, 150 |
| app/consultations/clinic-location.tsx | نعم | 2 | 2 | 94, 95 |
| app/returns/detail.tsx | نعم | 2 | 2 | 214, 263 |
| app/pharmacy/manual-order.tsx | نعم | 1 | 11 | 66, 67, 68, 69, 75, 99, 100, 104, 105, 106, 139 |
| app/maternity/maternity-setup.tsx | نعم | 1 | 9 | 229, 260, 273, 291, 304, 423, 427, 431, 446 |
| app/maternity/ovulation-tracker.tsx | نعم | 1 | 9 | 282, 360, 402, 414, 518, 522, 529, 531, 541 |
| app/returns/hub.tsx | نعم | 1 | 8 | 28, 34, 40, 44, 172, 205, 306, 371 |
| app/consultations/incoming-call.tsx | نعم | 1 | 6 | 73, 129, 158, 158, 160, 160 |
| src/theme/index.ts | لا | 1 | 6 | 105, 179, 233, 240, 247, 254 |
| app/maternity/baby-growth.tsx | نعم | 1 | 5 | 212, 216, 371, 393, 398 |
| app/diagnostics/package-detail.tsx | نعم | 1 | 4 | 85, 117, 118, 143 |
| app/diagnostics/results-history.tsx | نعم | 1 | 4 | 76, 81, 89, 117 |
| app/mental-health/breathing.tsx | نعم | 1 | 4 | 14, 15, 16, 153 |
| app/settings/privacy.tsx | نعم | 1 | 4 | 100, 168, 177, 194 |
| app/insurance/network-providers.tsx | نعم | 1 | 3 | 164, 169, 298 |
| app/community/post-detail.tsx | نعم | 1 | 2 | 146, 279 |
| app/maternity/pregnancy-tracker.tsx | نعم | 1 | 2 | 221, 312 |
| app/pharmacy/medicine-compare.tsx | نعم | 1 | 2 | 139, 141 |
| app/(auth)/otp.tsx | نعم | 1 | 1 | 254 |
| app/diagnostics/lab-comparison.tsx | نعم | 1 | 1 | 213 |
| app/diagnostics/orders.tsx | نعم | 1 | 1 | 321 |
| app/health/actionable-order.tsx | نعم | 1 | 1 | 172 |
| app/insurance/refund-status.tsx | نعم | 1 | 1 | 101 |
| app/nutrition/water-tracker.tsx | نعم | 1 | 1 | 168 |
| app/settings/language.tsx | نعم | 1 | 1 | 55 |
| app/settings/notifications.tsx | نعم | 1 | 1 | 247 |
| app/shared/location-picker.tsx | نعم | 1 | 1 | 819 |
| app/support/ticket.tsx | نعم | 1 | 1 | 118 |
| app/wallet/transactions.tsx | نعم | 1 | 1 | 200 |
| src/design-system/components/Avatar.tsx | نعم | 1 | 1 | 126 |
| src/features/consultation/InsuranceCopayScreen.tsx | نعم | 1 | 1 | 34 |
| src/features/medical-orders/ActionableOrderScreen.tsx | نعم | 1 | 1 | 48 |
| src/guided-tour/ui/SpotlightRenderer.tsx | نعم | 1 | 1 | 53 |
| src/constants/index.ts | لا | 0 | 73 | 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37 |
| src/constants/specialties.ts | لا | 0 | 45 | 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50 |
| app/profile/index.tsx | نعم | 0 | 12 | 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26 |
| app/notifications/index.tsx | نعم | 0 | 11 | 26, 27, 28, 29, 30, 31, 32, 33, 37, 38, 39 |
| app/nutrition/hub.tsx | نعم | 0 | 11 | 30, 37, 44, 51, 58, 65, 72, 79, 86, 93, 100 |
| app/(tabs)/services.tsx | نعم | 0 | 10 | 26, 33, 41, 48, 58, 65, 72, 79, 86, 93 |
| app/(tabs)/health.tsx | نعم | 0 | 8 | 37, 43, 49, 55, 61, 67, 73, 79 |
| app/nutrition/ai-plan-builder.tsx | نعم | 0 | 8 | 14, 15, 16, 17, 164, 165, 166, 167 |
| app/mental-health/hub.tsx | نعم | 0 | 7 | 24, 31, 38, 45, 52, 59, 66 |
| app/pharmacy/waiting-for-pharmacy.tsx | نعم | 0 | 7 | 163, 186, 226, 260, 268, 300, 303 |
| app/family/hub.tsx | نعم | 0 | 6 | 33, 39, 45, 51, 57, 63 |
| app/health/family-hub.tsx | نعم | 0 | 6 | 34, 40, 46, 52, 58, 64 |
| app/health/medications.tsx | نعم | 0 | 6 | 31, 38, 45, 52, 59, 66 |
| app/health/vitals-log.tsx | نعم | 0 | 6 | 19, 20, 21, 22, 225, 226 |
| app/health/vitals.tsx | نعم | 0 | 6 | 33, 41, 49, 57, 65, 73 |
| app/nutrition/body-composition.tsx | نعم | 0 | 6 | 36, 43, 50, 57, 64, 71 |
| app/pharmacy/order-history.tsx | نعم | 0 | 6 | 44, 45, 46, 265, 267, 281 |
| app/emergency/sos.tsx | نعم | 0 | 5 | 123, 153, 159, 165, 171 |
| app/health/edit-profile.tsx | نعم | 0 | 4 | 355, 356, 397, 466 |
| app/health/emergency-contacts.tsx | نعم | 0 | 4 | 83, 98, 136, 141 |
| app/ai/symptom-timeline.tsx | نعم | 0 | 3 | 22, 28, 30 |
| app/family/member-health.tsx | نعم | 0 | 3 | 58, 65, 72 |
| app/ai/prescription-translator.tsx | نعم | 0 | 2 | 245, 253 |
| app/diagnostics/test-detail.tsx | نعم | 0 | 2 | 77, 89 |
| app/emergency/sos-active.tsx | نعم | 0 | 2 | 51, 125 |
| app/family/calendar.tsx | نعم | 0 | 2 | 82, 99 |
| app/family/shared-calendar.tsx | نعم | 0 | 2 | 81, 99 |
| src/components/animations.tsx | لا | 0 | 2 | 106, 228 |
| app/consultations/clinic/[id].tsx | نعم | 0 | 1 | 68 |
| app/consultations/post-call-rating.tsx | نعم | 0 | 1 | 135 |
| app/diagnostics/book-sample.tsx | نعم | 0 | 1 | 68 |
| app/diagnostics/booking-confirm.tsx | نعم | 0 | 1 | 170 |
| app/diagnostics/my-results.tsx | نعم | 0 | 1 | 140 |
| app/diagnostics/search.tsx | نعم | 0 | 1 | 107 |
| app/diagnostics/technician-tracking.tsx | نعم | 0 | 1 | 113 |
| app/family/voice-call.tsx | نعم | 0 | 1 | 114 |
| app/health/chronic-disease.tsx | نعم | 0 | 1 | 102 |
| app/pharmacy/barcode-scanner.tsx | نعم | 0 | 1 | 124 |
| app/search/index.tsx | نعم | 0 | 1 | 156 |
| src/design-system/components/States.tsx | نعم | 0 | 1 | 155 |
| src/navigation/guards/AdminGuard.tsx | لا | 0 | 1 | 41 |

## معيار الإغلاق

1. استبدال أسطح الخلفية والنصوص والحدود غير المقصودة برموز colors من سياق التطبيق أو useTheme.
2. مراجعة كل ملف في قائمة الأولوية على الوضعين وعلى أحجام الهاتف واللوحي.
3. الإبقاء على الأبيض الصريح فقط حين تكون الخلفية ثابتة ومضمونة التباين (مثل أيقونة فوق زر الهوية).
4. توثيق حالات الاستثناء بذكر سببها في ملف الشاشة.
