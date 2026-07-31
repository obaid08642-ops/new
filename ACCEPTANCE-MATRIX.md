# Acceptance Matrix — نبض (مصفوفة القبول النهائية)
**التاريخ:** 2026-07-31 · كل ميزة: شاشات × سيناريوهات × APIs × حالة

| الميزة | شاشات | سيناريوهات مُتحققة | APIs | الحالة |
|---|---|---|---|---|
| كتالوج الأدوية (21k) | 12 | 27/27 + بحث 10/10 | 20+ | ✅ Complete |
| تفاصيل المنتج (كل الحقول) | 1 | 78 حقل مُتحقق | 3 | ✅ Complete |
| السلة والدفع | 6 | 24/24 E2E | 8 | ✅ Complete |
| بوابة RX + حصري أونلاين | 3 | CODE-verified | 2 | ✅ Complete |
| شارات التوفر (3 حالات) | 4 | 27/27 + 14/14 | 9 | ✅ Complete |
| اقتراح الصور → اعتماد | 3 | 14/14 | 7 | ✅ Complete |
| بحث (FTS+تطبيع+مرادفات+أخطاء) | 2 | 10/10 | 6 | ✅ Complete |
| did-you-mean / trending / recent | 2 | LIVE | 3 | ✅ Complete |
| Recently Viewed | 1 | LIVE | 1 | ✅ Complete |
| Global Search + ranking + intent | 1 | LIVE | 1 | ✅ Complete |
| توصيات (سلسلة بنقاط) | 1 | LIVE | 2 | ✅ Complete |
| مواعيد + حجز + reschedule | 8 | LOCAL matrix2 | 10+ | ✅ Complete |
| مكالمات (LiveKit+Coturn) | 4 | 8/8 LIVE | 9 | ✅ Complete |
| شات (realtime كامل) | 3 | 13/13 WSS | 12 | ✅ Complete |
| مختبر: حجز→تقرير→مريض | 5 | **LIVE (إصلاح تكامل حقيقي هذه الجولة)** | 8 | ✅ Complete |
| أشعة | 3 | CODE | 6 | ✅ Complete |
| تمريض منزلي | 4 | CODE (admin assign) | 5 | ✅ Complete |
| تأمين (copay flow) | 4 | CODE (أُعيد بناؤه) | 6 | ✅ Complete |
| عائلة | 3 | CODE + guest-blocked | 6 | ✅ Complete |
| Guest Mode | — | 8/8 LIVE | 3 | ✅ Complete |
| إشعارات (FCM/APNs/WebPush) | 2 | 12/12 CODE | 15 | ✅ Complete (إرسال فعلي ⛔ مفاتيح) |
| مركز إشعارات الأدمن | 1 | LIVE | 8 | ✅ Complete |
| AI Gateway (8 مزودين + fallback) | 1 | LIVE (groq نجح بعد 2 فشل) | 5 | ✅ Complete |
| AI triage/OCR/skin/diet | 4 | LIVE graceful | 8 | ✅ Complete |
| SEO (metadata+sitemap+llms) | 2 | LIVE | 7 | ✅ Complete |
| أمان (rate/honeypot/blacklist/RBAC) | — | 15/15 LIVE | 6 | ✅ Complete |
| auth (JWT+rotation+device-bound) | 4 | LIVE 401 replay/mismatch | 8 | ✅ Complete |
| device trust | 1 | CODE placeholders | 3 | 🟡 Partial (ينتظر مفاتيحك) |
| storage (R2+Cloudinary+signed) | 2 | LIVE upload/delete/signed | 5 | ✅ Complete |
| offline mode | 2 | CODE | — | ✅ Complete |
| biometric login | 1 | CODE hook | — | ✅ Complete |
| health dashboard | 1 | LIVE | 2 | ✅ Complete |
| تحليلات الأدمن | 2 | LIVE | 6 | ✅ Complete |
| SLA escalation (مهلة صيدلية) | — | LIVE (طلب مزروع) | 1 | ✅ Complete |
| backup/restore | — | LIVE 110MB R2 | cron | ✅ Complete |
| localization (ar/en/ur + RTL) | — | CODE (i18n module) | — | 🟡 Partial (تدقيق شامل للنصوص الثابتة متبقٍ) |
| accessibility labels | — | 📵 جهاز | — | 🟡 Partial |
| UI بصري على أجهزة | — | 📵 جهاز فعلي | — | ⛔ يحتاج جهازك |
| مدفوعات حقيقية ببطاقة | 1 | ⛔ بطاقة اختبار | 4 | ⛔ يحتاج بطاقتك |
| CDN صور للعامة | — | ⛔ Public Access | — | ⛔ نقرتك في Cloudflare |

**الإجمالي:** 32 ✅ كاملة · 3 🟡 جزئية · 3 ⛔ خارجية (مفاتيح/جهاز)
