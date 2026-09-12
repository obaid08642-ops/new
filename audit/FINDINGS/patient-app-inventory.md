# الجرد الذري — تطبيق المريض (Expo 57 + expo-router + RN 0.86)
> المصدر: فحص مباشر (P1-wave-1). **249 شاشة routable مؤكدة** (253 tsx − 4 layouts). تُملأ البطاقات التفصيلية في P1-wave-2.

## شجرة الشاشات (العدد = ملفات)
| المجلد | N | المجلد | N |
|---|---|---|---|
| consultations | 29 | health | 26 |
| pharmacy | 24 | diagnostics | 20 |
| nutrition | 13 | insurance | 13 |
| settings | 12 | family | 12 |
| (auth) | 10 | mental-health | 8 |
| (tabs) | 8 | maternity | 7 |
| ai | 7 | reports/nursing/loyalty | 5×3 |
| profile/payments/emergency/(onboarding) | 4×4 | returns/articles | 3×2 |
| offers/community/support + singletons ×19 | 2×3 | root | 4 |

## الملاحظات الحرجة (تُحسم P2)
- **i18n: 6 لغات مؤكدة** `ar/en/ur/hi/bn/fil` (tl→fil)، ar افتراضي، RTL مفروض (ar+ur). ملفات: `locales/{ar,en,hi,bn,ur,tl}.json` + `autoTranslationsPhase5.json` (~1.1MB — يُتحقق من جودته).
- **أمن التوكن: SecureStore فقط** (بلا AsyncStorage fallback)، redux-persist مشفر بقائمة بيضاء (theme/localization/device/settings/cart/app_config) — التوكن عبر SessionManager + rotation + x-device-id.
- **Deep linking: خريطة محدودة** (`(tabs) + (auth) + s/:type + product + doctor + tour`) مقابل 249 شاشة — فجوة تغطية مرشحة (P2).
- Domains: `nabdplus://` + 4 universal (`nabd.plus/www/app.nabd.plus/app.nabdahplus.com`, autoVerify).
- **LiveKit حقيقي** في `consultations/video-call.tsx` + `room/[id].tsx`؛ stub قديم `consultations/video/[id].tsx` موجود — يُحسم: ميت أم مستخدم.
- **ازدواج إشعارات**: `services/Notifications.ts` + `utils/notifications.ts` — تكرار مرشح للتوحيد.
- **`FASTAPI_BASE_URL` مذكور** في `HttpClient.ts:60` و`ConfigManager` — يُتحقق: خدمة OCR فقط (يوجد `ocr_worker.py`) أم باكند ثانٍ (مخالفة R1؟).
- Base URLs: dev localhost:8002 / staging `staging-api.nabdahplus.com` / prod `api.nabd.plus/api/v1`.
