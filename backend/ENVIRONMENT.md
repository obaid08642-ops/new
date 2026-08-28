# متغيرات البيئة المطلوبة — نبضة بلس (الإنتاج)

هذه القائمة تغطي **كل** متغير بيئة يقرأه الباك إند (`process.env.*` — مستخرجة آلياً من الشيفرة) وتطبيقات الواجهات. كل شيء آخر في المشروع مكتمل وجاهز؛ تعبئة هذه القيم هي الخطوة الوحيدة المتبقية قبل التشغيل الإنتاجي.

> مفتاح القراءة: ✅ = إلزامي للتشغيل الأساسي · ⚠️ = مطلوب لتفعيل ميزة محددة (وإلا تعمل الميزة بوضع متدهور آمن) · ➖ = اختياري

---

## 1) أساسي (إلزامي) — Core

| المتغير | الوصف |
|---|---|
| `MONGO_URL` ✅ | سلسلة اتصال MongoDB (مثال: `mongodb+srv://user:pass@cluster/nabdah`) |
| `DB_NAME` ✅ | اسم قاعدة البيانات (مثال: `nabdah_prod`) |
| `JWT_SECRET` ✅ | سر توقيع رموز JWT — سلسلة عشوائية طويلة (٣٢+ حرفاً) |
| `JWT_EXPIRES_IN` ➖ | مدة صلاحية الرمز (افتراضي `7d`) |
| `REDIS_URL` ✅ | عنوان Redis الكامل `redis://[:pass@]host:6379` (يُستخدم للطوابير BullMQ + OTP + الكاش) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` ⚠️ | بدائل تجزئة إن لم يُضبط `REDIS_URL` |
| `PORT` ➖ | منفذ الخادم (افتراضي `3000`) |
| `NODE_ENV` ✅ | `production` في الإنتاج |
| `API_BASE_URL` / `NABD_PUBLIC_URL` / `PUBLIC_APP_URL` ✅ | العنوان العلني للباك إند (روابط داخل الإشعارات والبريد) |
| `PROVIDER_APP_BASE_URL` ➖ | رابط تطبيق المزوّد العلني |
| `ALLOWED_ORIGINS` ✅ | نطاقات CORS المسموحة مفصولة بفواصل (لوحات الإدارة + الويب) |
| `THROTTLER_LIMIT` ➖ | حد الطلبات/دقيقة (افتراضي داخلي) |
| `USE_MEMORY_MONGO` ➖ | **للاختبار فقط** — `true` يشغّل قاعدة داخل الذاكرة؛ يجب أن يكون غير مضبوط في الإنتاج |
| `DATA_RETENTION_DAYS` ➖ | مدة الاحتفاظ بالسجلات الحساسة (PDPL) |
| `SENTRY_DSN` ➖ | مراقبة الأخطاء الإنتاجية |

## 2) المصادقة والتحقق (OTP يصل عبر البريد + الرسائل + الإشعارات معاً)

| المتغير | الوصف |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` ⚠️ | خادم البريد لإرسال رمز OTP بريدياً |
| `SMTP_FROM` / `PROVIDER_MAIL_FROM` ⚠️ | عنوان المُرسل الظاهر |
| `RESEND_API_KEY` ➖ | بديل Resend للبريد |
| `INFOBIP_API_KEY` / `INFOBIP_BASE_URL` / `INFOBIP_SENDER` / `INFOBIP_URL` ⚠️ | قناة SMS (Infobip) لرمز OTP |
| `UNIFONIC_APP_ID` ⚠️ | قناة SMS بديلة (Unifonic السعودية) |
| `TAQNYAT_API_KEY` ⚠️ | قناة SMS بديلة (تقنية السعودية) |
| `SMS_WEBHOOK_TOKEN` ➖ | توكن التحقق لردود SMS الواردة |
| `FEATURE_WHATSAPP` ➖ | تفعيل قناة واتساب للإشعارات |

## 3) الإشعارات الفورية (Push)

| المتغير | الوصف |
|---|---|
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` ⚠️ | Firebase Cloud Messaging (إشعارات أندرويد/iOS — يشمل OTP push) |
| `FCM_SERVER_KEY` ➖ | المفتاح القديم (legacy) إن لزم |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` ⚠️ | حساب Firebase الخدمي (نفس القيم غالباً) |

## 4) المدفوعات

| المتغير | الوصف |
|---|---|
| `MOYASAR_API_KEY` / `MOYASAR_SECRET_KEY` / `MOYASAR_WEBHOOK_SECRET` ⚠️ | بوابة مويصر (المدفوعات الرئيسية + copay التأمين) |
| `PAYTABS_SERVER_KEY` ⚠️ | بوابة PayTabs البديلة |
| `PAYMOB_API_KEY` / `PAYMOB_HMAC_SECRET` / `PAYMOB_IFRAME_ID` / `PAYMOB_INTEGRATION_ID` ⚠️ | بوابة Paymob البديلة |
| `TAP_API_KEY` ⚠️ | بوابة Tap البديلة |
| `STRIPE_SECRET_KEY` ⚠️ | Stripe للمدفوعات الدولية |

## 5) المكالمات المرئية (فئة FaceTime — LiveKit)

| المتغير | الوصف |
|---|---|
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` ⚠️ | مفاتيح خادم LiveKit لإصدار توكن الغرف |
| `COTURN_HOST` / `COTURN_SECRET` / `COTURN_STUN_PORT` / `COTURN_TURN_PORT` ⚠️ | خادم TURN/STUN لعبور NAT في المكالمات |

## 6) الذكاء الاصطناعي

| المتغير | الوصف |
|---|---|
| `GEMINI_API_KEY` ⚠️ | Google Gemini — محرّك الفرز الطبي (triage) والتقارير والصوت |
| `FEATURE_AI_SYMPTOM` ➖ | مفتاح تفعيل ميزة فحص الأعراض (افتراضي مفعّل) |

## 7) التخزين (الملفات والتقارير الطبية والوسائط)

| المتغير | الوصف |
|---|---|
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` / `S3_PUBLIC_BASE_URL` ⚠️ | تخزين S3-متوافق للملفات الطبية |
| `CLOUDFLARE_R2_ACCOUNT_ID` / `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY` / `CLOUDFLARE_R2_BUCKET_NAME` / `CLOUDFLARE_R2_PUBLIC_URL` ⚠️ | بديل Cloudflare R2 |

## 8) مفاتيح الميزات (Feature Flags — افتراضياً مفعّلة)

| المتغير | الوصف |
|---|---|
| `FEATURE_HOME_VISIT` ➖ | الرعاية المنزلية |
| `FEATURE_INSURANCE` ➖ | مسار التأمين وتحمّل المريض |
| `FEATURE_LOYALTY` ➖ | نقاط الولاء |
| `FEATURE_TELEHEALTH` ➖ | الاستشارات عن بُعد |
| `FEATURE_AI_SYMPTOM` ➖ | فحص الأعراض بالذكاء الاصطناعي |
| `FEATURE_WHATSAPP` ➖ | إشعارات واتساب |

## 9) متفرقات

| المتغير | الوصف |
|---|---|
| `ZATCA_SELLER_NAME` / `ZATCA_VAT_NUMBER` ⚠️ | بيانات المنشأة لفوترة زاتكا الإلكترونية |
| `INDEXNOW_KEY` ➖ | أرشفة محركات البحث للويب العام |

---

## متغيرات تطبيقات الواجهات (Expo — تُضبط وقت البناء)

### تطبيق المريض وتطبيق المزوّد (`nabd_plus`, `NabdProvider`)

| المتغير | الوصف |
|---|---|
| `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_BACKEND_URL` ✅ | عنوان الباك إند العلني (`https://api.example.com/api/v1`) |
| `EXPO_PUBLIC_SOCKET_URL` ✅ | عنوان WebSocket (نفس المضيف غالباً) |
| `EXPO_PUBLIC_LIVEKIT_URL` ⚠️ | عنوان LiveKit (`wss://livekit.example.com`) للمكالمات |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ⚠️ | خرائط جوجل (تتبع السائق/التمريض) |
| `EXPO_PUBLIC_FIREBASE_API_KEY` ⚠️ | إعداد FCM من جهة التطبيق |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` ➖ | بديل OneSignal للإشعارات |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` ➖ | تسجيل الدخول بجوجل |
| `EXPO_PUBLIC_X_CLIENT_ID` / `EXPO_PUBLIC_SNAPCHAT_CLIENT_ID` ➖ | تسجيل دخول اجتماعي إضافي |
| `EXPO_PUBLIC_SENTRY_DSN` ➖ | مراقبة أخطاء التطبيق |
| `EXPO_PUBLIC_APP_ENV` ✅ | `production` |
| `EXPO_PUBLIC_API_TIMEOUT` ➖ | مهلة الطلبات بالمللي ثانية |
| `EXPO_PUBLIC_CDN_URL` / `EXPO_PUBLIC_PROJECT_ID` / `EXPO_PUBLIC_AI_URL` / `EXPO_PUBLIC_FASTAPI_BASE_URL` ➖ | نقاط خدمات مساعدة إن وُجدت |

> ملاحظة: لوحات الإدارة (`Napd-admin`) تُضبط عناوينها عبر `REACT_APP_*`/`NEXT_PUBLIC_*` في ملفات البيئة الخاصة بكل لوحة، وتشير لنفس عنوان الباك إند.

---

## الإضافات الجديدة (دورة الإشعارات والمراسلة)

### APNs — إشعارات iOS المباشرة (HTTP/2)
| المتغير | الوصف |
|---|---|
| `APNS_KEY_ID` | معرف مفتاح APNs من Apple Developer (10 أحرف) |
| `APNS_TEAM_ID` | معرف فريق Apple Developer |
| `APNS_BUNDLE_ID` | معرف حزمة التطبيق iOS (مثل com.nabdahplus.app) |
| `APNS_AUTH_KEY` | محتوى ملف .p8 كاملاً (يتضمن BEGIN/END PRIVATE KEY) |
| `APNS_TOPIC` | موضوع الإشعارات = Bundle ID عادة |
| `APNS_HOST` | اختياري: https://api.sandbox.push.apple.com للتطوير |

### Web Push (VAPID) — جاهزية PWA مستقبلاً
| المتغير | الوصف |
|---|---|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | المفتاح العام — يولَّد بـ `npx web-push generate-vapid-keys` |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | المفتاح الخاص — سرّي |
| `WEB_PUSH_VAPID_SUBJECT` | mailto: بريد الدعم |

### البريد — Resend أساسي + SES احتياطي تلقائي
| المتغير | الوصف |
|---|---|
| `MAIL_FROM` | عنوان المرسل الموحد (مثل: نبضة بلس <no-reply@yourdomain.com>) |
| `SES_SMTP_HOST` | مثل email-smtp.me-south-1.amazonaws.com |
| `SES_SMTP_PORT` | 587 (أو 465 مع secure) |
| `SES_SMTP_USER` / `SES_SMTP_PASS` | بيانات SES SMTP |
| `SES_FROM` | مرسل SES (يُستخدم MAIL_FROM عند غيابه) |

### SMS — معطل افتراضياً
| المتغير | الوصف |
|---|---|
| `SMS_ENABLED` | false افتراضياً. التفعيل الفعلي من لوحة الأدمن عبر feature flag `sms_enabled` بدون كود |

### الذكاء الاصطناعي — تبديل المزود بدون كود
| المتغير | الوصف |
|---|---|
| `AI_PROVIDER` | gemini \| openai \| openrouter \| groq |
| `AI_MODEL` / `AI_VISION_MODEL` | تجاوز عام للنموذج |
| `OPENAI_API_KEY` (+`OPENAI_MODEL`) | مزود OpenAI |
| `OPENROUTER_API_KEY` (+`OPENROUTER_MODEL`) | مزود OpenRouter |
| `GROQ_API_KEY` (+`GROQ_MODEL`/`GROQ_VISION_MODEL`) | مزود Groq |

### TURN إضافي
| المتغير | الوصف |
|---|---|
| `TURN_REALM` / `COTURN_REALM` | نطاق المصادقة (يطابق realm في turnserver.conf) |
| `TURN_URLS` | تجاوز كامل لقائمة ICE URLs (مفصولة بفواصل) |
