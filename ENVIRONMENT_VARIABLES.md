# متغيرات البيئة الكاملة — مشروع نبضة بلس
**مستخرجة آليًا من الكود الفعلي (grep على process.env / EXPO_PUBLIC / NEXT_PUBLIC) — 24/07/2026**
**التصنيف:** 🔴 إلزامي للإقلاع · 🟡 إلزامي للميزة (بدونه تتعطل الميزة لا التطبيق) · 🟢 اختياري

---

## 1) الباك إند (nabdah-backend — ملف `.env`)

### البنية الأساسية
| المتغير | الحالة | الغرض |
|---|---|---|
| `MONGO_URL` | 🔴 | رابط MongoDB (مثل `mongodb+srv://user:pass@cluster.mongodb.net`) |
| `DB_NAME` | 🔴 | اسم القاعدة (مثل `nabdah_prod`) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | 🔴 | Redis للطوابير (BullMQ: إشعارات/تسليم) والأقفال والكاش — بدونه تسقط طوابير الإشعارات للمسار المباشر |
| `JWT_SECRET` | 🔴 | سر توقيع JWT (64+ حرف عشوائي) — **نفسه يُستخدم للتحقق في السوكت** |
| `PORT` | 🟢 | منفذ الخدمة (افتراضي 3000/3001) |
| `NODE_ENV` | 🔴 | `production` للإنتاج (يفعّل Sentry sampling 0.1 وCORS الصارم) |
| `ALLOWED_ORIGINS` | 🔴 إنتاجي | نطاقات CORS والسوكت مفصولة بفواصل (مثل `https://nabdah.com,https://admin.nabdah.com`) |

### المدفوعات — بوابة واحدة على الأقل (بدون أي واحدة **يفشل الإقلاع**: NO_PAYMENT_GATEWAY_CONFIGURED)
| `MOYASAR_API_KEY` | 🟡 (الموصى به — سعودي) | مفتاح Moyasar السري `sk_live_...` |
| `MOYASAR_SECRET_KEY` / `MOYASAR_WEBHOOK_SECRET` | 🟡 | التحقق + webhook الاسترداد |
| `MOYASAR_PUBLISHABLE_KEY` | 🟡 | للواجهات |
| `STRIPE_SECRET_KEY` | 🟢 بديل | بوابة بديلة مدعومة |
| `TAP_API_KEY` | 🟢 بديل | بوابة بديلة مدعومة |
| `PAYMOB_*` (4 متغيرات) | 🟢 | مصر — وحدة غير مسجلة حاليًا |
| `PAYTABS_SERVER_KEY` | 🟢 | متغير موجود بالكود |

### الإشعارات — Push
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | 🟡 | FCM HTTP v1 (firebase-admin v14) — لتطبيقي المريض/المزود بتوكنات FCM |
| `FCM_SERVER_KEY` | 🟢 قديم | لا يُستخدم فعليًا (الكود v14) |
| — توكنات Expo | تلقائي | توكنات `ExponentPushToken` تُرسل عبر exp.host API (بلا مفتاح) |

### SMS / OTP
| `TAQNYAT_API_KEY` | 🟡 | تقنيات (سعودي) — مزود SMS |
| `UNIFONIC_APP_ID` | 🟡 | Unifonic بديل |
| `INFOBIP_API_KEY`/`INFOBIP_BASE_URL`/`INFOBIP_SENDER` | 🟡 | Infobip بديل |
| `SMS_WEBHOOK_TOKEN` | 🟢 | تأمين webhook حالات التسليم |

### المكالمات (فيديو/صوت)
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | 🟡 | LiveKit Cloud أو self-hosted — الاستشارات المرئية |
| `COTURN_HOST` / `COTURN_SECRET` / `COTURN_STUN_PORT` / `COTURN_TURN_PORT` | 🟡 | خادم TURN/STUN — ضروري لاتصالات WebRTC خلف NAT |

### الذكاء الاصطناعي
| `GEMINI_API_KEY` | 🟡 | Gemini — voice-to-order وprescription OCR الحقيقيان |

### البريد
| `RESEND_API_KEY` | 🟡 | Resend للبريد المعاملاتي |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`/`SMTP_SECURE` | 🟢 بديل | SMTP مباشر |
| `PROVIDER_MAIL_FROM` | 🟢 | عنوان مرسل إشعارات المزودين |

### زاتكا (الفوترة — المرحلة 1)
| `ZATCA_SELLER_NAME` | 🟡 | اسم البائع في QR الفاتورة (TLV tag 1) |
| `ZATCA_VAT_NUMBER` | 🟡 | الرقم الضريبي 15 خانة يبدأ/ينتهي بـ3 (TLV tag 2) |

### SEO / الروابط العميقة
| `NABD_PUBLIC_URL` | 🟡 SEO | الرابط العام للباك (sitemap/robots/canonical) مثل `https://api.nabdah.com` |
| `PUBLIC_APP_URL` | 🟡 | رابط الموقع العام (الدليل العام) |
| `PROVIDER_APP_BASE_URL` | 🟢 | رابط تطبيق المزود للإشعارات البريدية |
| `INDEXNOW_KEY` | 🟢 | تسريع الأرشفة Bing/Yandex |
| `API_BASE_URL` | 🟢 | مرجع داخلي |

### المراقبة والأمان
| `SENTRY_DSN` | 🟢 موصى به | تتبع الأخطاء (sampling 0.1 إنتاجيًا تلقائيًا) |
| `THROTTLER_LIMIT` | 🟢 | حد الطلبات/دقيقة |
| `DATA_RETENTION_DAYS` | 🟢 | سياسة الاحتفاظ بالبيانات |

### Feature Flags (افتراضيًا كلها تعمل)
| `FEATURE_TELEHEALTH` / `FEATURE_INSURANCE` / `FEATURE_LOYALTY` / `FEATURE_HOME_VISIT` / `FEATURE_WHATSAPP` / `FEATURE_AI_SYMPTOM` | 🟢 | `false` لتعطيل ميزة |

---

## 2) تطبيق المريض (nabd_plus — `app.json` extra أو `.env` لـ EAS)
| المتغير | الحالة | الغرض |
|---|---|---|
| `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_API_BASE_URL` | 🔴 | رابط الباك `https://api.nabdah.com/api/v1` |
| `EXPO_PUBLIC_SOCKET_URL` | 🔴 | رابط السوكت (نفس الباك بدون /api) |
| `EXPO_PUBLIC_BACKEND_URL` | 🔴 | الرابط الخام للباك |
| `EXPO_PUBLIC_LIVEKIT_URL` | 🟡 | `wss://livekit.nabdah.com` للمكالمات |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | 🟡 | خرائط المواقع/الإسعاف |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | 🟡 | FCM على أندرويد |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | 🟢 بديل | إن اخترتم OneSignal |
| `EXPO_PUBLIC_SENTRY_DSN` | 🟢 | تتبع أخطاء التطبيق |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` + `_ANDROID_/_IOS_` | 🟢 | تسجيل Google الاجتماعي |
| `EXPO_PUBLIC_CDN_URL` | 🟢 | CDN الصور |
| `EXPO_PUBLIC_PROJECT_ID` | 🟢 | EAS project (إشعارات Expo) |
| `EXPO_PUBLIC_APP_ENV` | 🟢 | production/staging |
| `EXPO_PUBLIC_API_TIMEOUT` | 🟢 | مهلة الطلبات |
| `EXPO_PUBLIC_AI_URL` / `EXPO_PUBLIC_FASTAPI_BASE_URL` | 🟢 | خدمات AI إن فُصلت |
| `EXPO_PUBLIC_SNAPCHAT_CLIENT_ID` / `EXPO_PUBLIC_X_CLIENT_ID` | 🟢 | تسجيل اجتماعي إضافي |

## 3) تطبيق المزود (NabdProvider)
نفس متغيرات المريض ذات الصلة: `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_BACKEND_URL` / `EXPO_PUBLIC_SOCKET_URL` 🔴 + `EXPO_PUBLIC_LIVEKIT_URL` 🟡 + خرائط 🟢.
> ملاحظة: السوكت الآن يجلب JWT تلقائيًا من Vault — لا متغير إضافي.

## 4) لوحة الأدمن (Napd-admin/web-admin — `.env.local`)
| المتغير | الحالة | الغرض |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 🔴 | رابط الباك للوحة (كل الصفحات الـ16) |
| `NEXT_PUBLIC_SITE_URL` | 🟡 SEO | رابط الموقع العام (canonical/OG في الصفحات العامة) |

---

## الحد الأدنى للإقلاع التجريبي (Pilot)
```
MONGO_URL, DB_NAME, REDIS_HOST/PORT, JWT_SECRET, NODE_ENV=production,
ALLOWED_ORIGINS, MOYASAR_API_KEY, FIREBASE_*(3), TAQNYAT_API_KEY,
LIVEKIT_*(2), ZATCA_*(2), NABD_PUBLIC_URL, NEXT_PUBLIC_API_URL,
EXPO_PUBLIC_API_URL/BACKEND_URL/SOCKET_URL
```
كل ما عداها يفعّل مزايا إضافية ولا يمنع التشغيل.
