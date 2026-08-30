# Patient Mobile — Screen/API Matrix (auto-generated from code, 2026-08-30)

## ملخص
| المؤشر | العدد |
|---|---:|
| ملفات routes/شاشات | 243 |
| شاشات حقيقية (غير redirect) | 200 |
| Redirect-only | 43 |
| بلا أي API call | 97 |
| @ts-nocheck (خارج فحص الأنواع) | 181 |
| Guest guard | 8 |
| مسارات API فريدة في Mobile | 214 |
| مسارات API تطابق Backend controllers | 204 |
| مسارات API بلا Backend controller مطابق | 2 (بعد التدقيق الدقيق) |

## Redirect-only routes (legacy aliases)
- `/ai/chat-doctor` → `/ai/triage`
- `/ai/symptom-checker` → `/ai/triage`
- `/ai/symptom-timeline` → `/ai/triage`
- `/diagnostics/booking-confirm` → `/(tabs)/diagnostics`
- `/diagnostics/checkout` → `/(tabs)/diagnostics`
- `/diagnostics/sample-tracking` → `/diagnostics/orders`
- `/diagnostics/technician-tracking` → `/diagnostics/orders`
- `/diagnostics/upload-rx` → `/pharmacy/scan-prescription`
- `/pharmacy/product-search` → `/search`
- `/emergency` → `/emergency/sos`
- `/family` → `/health/family-hub`
- `/family/shared-calendar` → `/family/calendar`
- `/mental-health/breathing` → `/mental-health/hub`
- `/mental-health` → `/mental-health/hub`
- `/mental-health/meditation` → `/mental-health/hub`
- `/mental-health/self-assessment` → `/mental-health/hub`
- `/mental-health/therapist-match` → `/(tabs)/consultations`
- `/health/add-family-member` → `/family/invite`
- `/health/family-calendar` → `/family/shared-calendar`
- `/health/family-chat` → `/family/chat`
- `/health/family-member-detail` → `/family/member-health`
- `/health/reminders` → `/health/medication-reminder-list`
- `/health/smart-reminders` → `/health/medication-reminder-list`
- `/insurance` → `/insurance/hub`
- `/nutrition/ai-meal-planner` → `/nutrition/daily-tracker`
- `/nutrition/ai-plan-builder` → `/nutrition/hub`
- `/nutrition/body-composition` → `/nutrition/body-target`
- `/nutrition/calorie-analyzer` → `/nutrition/log-meal`
- `/nutrition/exercise-plan` → `/nutrition/daily-tracker`
- `/nutrition/food-scanner` → `/nutrition/log-meal`
- `/nutrition` → `/nutrition/hub`
- `/nutrition/nutrition-plan` → `/nutrition/hub`
- `/nutrition/water-tracker` → `/nutrition/daily-tracker`
- `/profile/edit` → `/health/edit-profile`
- `/reports/ai-analysis` → `/health/reports`
- `/settings/notifications` → `/settings/notifications-settings`
- `/settings/support-chat` → `/support/chat`
- `/consultations/video/[id]` → `None`
- `/consultations/offer/[id]` → `None`
- `/maternity/baby-development` → `/maternity/hub`
- `/maternity/baby-growth` → `/maternity/hub`
- `/maternity/ovulation-tracker` → `/maternity/hub`
- `/maternity/pregnancy-tracker` → `/maternity/hub`

## API paths بلا controller مطابق — بعد التدقيق الدقيق (2026-08-30)
**يتيمة فعلاً (تحتاج بناء Backend):**
- `/medical/programs/active` — مستخدم في `app/programs/active.tsx` — لا يوجد controller باسم medical/programs.
- `/medical/programs/complete-session` — نفس الشاشة — لا يوجد controller.

**إنذارات كاذبة (موجودة في Backend لكن التحليل الآلي الأول أساء قراءتها):**
- `/articles...` → controller `articles` موجود (كانت query strings).
- `/providers?...` → controller `providers` موجود.
- `/chat/threads/...` → controller معرّف داخل `chat.module.ts` بأسلوب مباشر (لا عبر decorator) — يوجد فعلياً.

## الشاشات الحقيقية بلا API (تحتاج مراجعة: static أو ناقصة؟)
- `/ai-assistant` (210 أسطر)
- `` (63 أسطر)
- `/privacy` (158 أسطر)
- `/provider-info` (91 أسطر)
- `/terms` (146 أسطر)
- `/payments/failed` (152 أسطر)
- `/payments/failure` (102 أسطر)
- `/payments/processing` (530 أسطر)
- `/payments/success` (132 أسطر)
- `/offers/[id]` (233 أسطر)
- `/services` (220 أسطر)
- `/ai/prescription-translator` (291 أسطر)
- `/diagnostics/book-sample` (60 أسطر)
- `/diagnostics/booking-success` (110 أسطر)
- `/diagnostics/my-results` (202 أسطر)
- `/diagnostics/results-history` (125 أسطر)
- `/diagnostics/test-detail` (178 أسطر)
- `/pharmacy/barcode-scanner` (239 أسطر)
- `/pharmacy/cart` (18 أسطر)
- `/pharmacy/chat-with-pharmacist` (14 أسطر)
- `/pharmacy/custom-item` (12 أسطر)
- `/pharmacy/drug-not-found` (12 أسطر)
- `/emergency/sos` (315 أسطر)
- `/voice` (163 أسطر)
- `` (314 أسطر)
- `/language` (69 أسطر)
- `/permissions` (220 أسطر)
- `/family/emergency-contacts` (193 أسطر)
- `/family/scan` (95 أسطر)
- `/mental-health/hub` (71 أسطر)
- `/health/actionable-order` (160 أسطر)
- `/insurance/copay` (134 أسطر)
- `/room/[id]` (295 أسطر)
- `/services` (123 أسطر)
- `/settings/about` (398 أسطر)
- `/settings/data` (221 أسطر)
- `/settings/help` (290 أسطر)
- `/settings` (236 أسطر)
- `/settings/language` (60 أسطر)
- `/settings/terms` (196 أسطر)
- `/consultations/appointment-detail` (277 أسطر)
- `/consultations/appointments` (437 أسطر)
- `/consultations/booking-confirm` (172 أسطر)
- `/consultations/booking-pending` (76 أسطر)
- `/consultations/booking-success` (362 أسطر)
- `/consultations/clinic-confirm` (199 أسطر)
- `/consultations/doctor-profile` (38 أسطر)
- `/consultations/summary` (181 أسطر)
- `/consultations/clinic/[id]` (111 أسطر)
- `/maternity/fetus-data` (175 أسطر)
- `/support/chat` (398 أسطر)
- `/support/ticket` (142 أسطر)
- `/returns/detail` (283 أسطر)
- `/returns/hub` (407 أسطر)

## خطر الأنواع: @ts-nocheck
181 شاشة خارج typecheck — أي خطأ نوع فيها غير مكشوف.
