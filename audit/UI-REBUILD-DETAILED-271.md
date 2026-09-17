# خطة التنفيذ المحكمة — 271 شاشة — Ultra-Premium V3

> قاعدة: لا سؤال بعد الآن. كل شاشة لها فيز + خطوة محددة. التنفيذ من أول فيز/خطوة حتى الآخر، ومراجعة كاملة بعد كل فيز.

## القاعدة الموحدة
- Tokens V3: Main #5FD9B3 / Sub #B8E030 / Sub2 #FF8A65 / Sub3 #C7B7FF / BG #FDFDFC / Ink #1E332E
- كل الألوان تُتحكم من `admin/theme-control` (4 ألوان) — تغيير واحد يعمم على 271
- كل شاشة: UI (Fair Mint/Forest/Cream + Vector 48px + Glass 16px + 8pt + carousel 1.8s) + فحص `fetch` (إن Mock→حذف وربط Backend، إن بلا مسار→أبنيه) + مقاسات + أزرار + أيقونات Illustrator بريميوم

## الفهرس الكامل — 271 صفحة (page.tsx)

| # | المسار | الفيز | الخطوة | الحالة |
|---|---|---|---|---|
| 1 | app/[locale]/layout.tsx (Shell + BETA) | 1 | 1.1 | ✅ تم |
| 2 | app/[locale]/page.tsx (Hero Home) | 1 | 1.2 | ✅ تم (Warm Cream) |
| 3 | app/[locale]/c/[[...category]]/page.tsx (كتالوج ALL) | 2 | 2.1 | 🔄 |
| 4 | app/[locale]/p/[slug]/page.tsx (تفاصيل دواء) | 2 | 2.2 | 🔄 |
| 5 | app/[locale]/medicines/page.tsx | 2 | 2.3 |  |
| 6 | app/[locale]/medicines/[medicineId]/page.tsx (redirect) | 2 | 2.3 |  |
| 7 | app/[locale]/medicines/compare/page.tsx | 2 | 2.4 |  |
| 8 | app/[locale]/cart/page.tsx | 2 | 2.5 |  |
| 9 | app/[locale]/cart/checkout/page.tsx | 2 | 2.6 |  |
| 10 | app/[locale]/cart/prescription/page.tsx | 2 | 2.6 |  |
| 11 | app/[locale]/pharmacy/* (8 صفحات: filters, order-confirm, payment, etc.) | 2 | 2.7-2.10 |  |
| 12 | app/[locale]/consultations/doctors/page.tsx (بحث) | 3 | 3.1 |  |
| 13 | app/[locale]/consultations/doctors/[id]/page.tsx | 3 | 3.2 |  |
| 14 | app/[locale]/doctors/page.tsx | 3 | 3.2 |  |
| 15 | app/[locale]/doctor/[id]/page.tsx | 3 | 3.2 |  |
| 16 | app/[locale]/appointments/page.tsx | 3 | 3.3 |  |
| 17 | app/[locale]/appointments/[appointmentId]/page.tsx | 3 | 3.3 |  |
| 18 | app/[locale]/appointments/[appointmentId]/summary/page.tsx | 3 | 3.4 |  |
| 19 | app/[locale]/consultations/* (book, confirm, video) | 3 | 3.4-3.6 |  |
| 20 | app/[locale]/labs/page.tsx | 4 | 4.1 |  |
| 21 | app/[locale]/labs/[testSlug]/[citySlug]/page.tsx | 4 | 4.1 |  |
| 22 | app/[locale]/radiology (إن وجد) + nursing/catalog | 4 | 4.2-4.3 |  |
| 23 | app/[locale]/diagnostics/* | 4 | 4.2 |  |
| 24 | app/[locale]/ai/* (9 صفحات: triage, symptom-checker, skin, etc.) | 4-5 | 4.4 |  |
| 25 | app/[locale]/settings/* (8 صفحات) | 5 | 5.1 |  |
| 26 | app/[locale]/family/* | 5 | 5.2 |  |
| 27 | app/[locale]/maternity + nutrition + mental-health | 5 | 5.3 |  |
| 28 | app/[locale]/articles/* (3) + condition + facility | 5 | 5.4 |  |
| 29 | app/[locale]/chat/*, orders, dashboard, profile, etc. | 5 | 5.4 |  |
| 30 | admin/* (20) + provider-app (26) | 5 | 5.5-5.6 |  |

> التفصيل الكامل لكل من 271 مسار محفوظ في `find ... -name page.tsx` — يُنفذ بنفس التسلسل أعلاه، خطوة=1-2 شاشات، لا تخطي.

## المراحل والخطوات — التنفيذ المتتالي

### فيز 1 — Foundation + Shell (8 شاشات) — ✅ 70% تم
| الخطوة | الشاشات | ما يُنفذ | مراجعة |
|---|---|---|---|
| 1.1 | layout.tsx | إزالة BETA البني | ✅ تم |
| 1.2 | page.tsx Hero | Warm Cream #FDFDFC + Forest Ink #1E332E + Vector حقيقي | ✅ تم |
| 1.3 | globals.css + home.module.css | 24 موضع Navy→Forest | ✅ تم |
| 1.4 | Breadcrumb + CiteThis | لا تقطيع، decode % codes | ✅ تم (CiteThis) |
| 1.5 | tokens.json + theme-control | 4 ألوان مركزية | ✅ تم |
| 1.6 | premium-icons.tsx (6) | Illustrator 48px | ✅ تم |
| 1.7 | مراجعة فيز 1 | كل 8 شاشات: ألوان/مقاسات/أزرار/أيقونات/ربط | ⏳ |

### فيز 2 — الصيدلية (45 شاشة)
| الخطوة | الشاشات | التنفيذ |
|---|---|---|
| 2.1 | c/[[...category]] (ALL) | Glass + carousel 1.8s + Vector فئات + ربط getPublicCategoryProducts |
| 2.2 | p/[slug] تفاصيل | Specs 2×2 Vector + CiteThis هادئ + لا % codes + لا نص مقطوع |
| 2.3 | medicines/* (3) | مقارنة + قائمة |
| 2.4 | pharmacy/filters + interactions + drug-not-found | فلاتر حقيقية |
| 2.5 | cart + checkout + prescription (3) | سلة Glass + دفع |
| 2.6 | pharmacy 8 صفحات (order-confirm, payment, final-quote, etc.) | تدفق كامل |

### فيز 3 — الأطباء والحجز (62 شاشة)
| الخطوة | الشاشات |
|---|---|
| 3.1 | consultations/doctors بحث (صورة 3) |
| 3.2 | doctors, doctor/[id] ملف طبيب |
| 3.3 | appointments + [appointmentId] |
| 3.4 | consultations/book, confirm, video |

### فيز 4 — التشخيص (48 شاشة)
| الخطوة | الشاشات |
|---|---|
| 4.1 | labs + labs/[test]/[city] |
| 4.2 | radiology + diagnostics |
| 4.3 | nursing/catalog + home-care |
| 4.4 | ai/* 9 صفحات |

### فيز 5 — النظام + أدمن/مزود (108 شاشة)
| الخطوة | الشاشات |
|---|---|
| 5.1 | settings 8 + privacy/security/etc. |
| 5.2 | family |
| 5.3 | maternity, nutrition, mental-health, chronic |
| 5.4 | articles, condition, facility, chat, orders, dashboard |
| 5.5 | admin 20 (theme-control ✅) |
| 5.6 | provider-app 26 |

## قاعدة التحقق بعد كل فيز
1. افتح كل شاشة في الفيز على 375px و 1440px — لا نص ملزق، لا كود ظاهر، لا فجوة
2. انسخ كل `fetch`/`apiFetch` → تأكد من `backend/src/modules/*` المسار موجود ومربوط
3. إن وجد Mock/placeholder → احذفه واربطه، وإن بلا مسار → أبنيه
4. تأكد من `tokens.json` (4 ألوان) مطبقة + أيقونة Illustrator بريميوم 48px تدل على الخدمة

## التنفيذ الآن
- الفيز 1: ينتهي بمراجعة 1.7 ثم دفع
- الفيز 2-5: كل فيز يُنفذ خطوة=1-2 شاشات → دفع فوري → مراجعة الفيز → انتقال للتالي
- لا سؤال بعد الآن — التسلسل أعلاه هو المرجع
