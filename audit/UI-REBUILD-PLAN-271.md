# خطة إعادة بناء UI/UX — 271 شاشة — Ultra-Premium V3

> Tokens: Fair Mint #5FD9B3 (main), Lime #B8E030 (sub), Forest Ink #1E332E (text), Cream #FDFDFC (bg)
> المبدأ: كل مرحلة تُسلم شاشات مكتملة ومربوطة Backend، لا Mock، لا Placeholder

## الجرد الدقيق: 271 صفحة (page.tsx) + 27 route.ts

## التقسيم — 5 مراحل، كل مرحلة دفع مستقل

### المرحلة 0 — Foundation (تم ✅)
| الخطوة | الملفات | الحالة |
|---|---|---|
| 0.1 tokens.json v3 | packages/design-tokens/tokens.json | ✅ |
| 0.2 globals.css (ink→#1E332E, brand→#5FD9B3, canvas→#FDFDFC) | patient-web/app/globals.css | ✅ |
| 0.3 home.module.css navy→Forest | patient-web/app/[locale]/home.module.css | ✅ (16+8 مواضع) |
| 0.4 admin/theme-control | admin/src/pages/admin/theme-control.tsx | ✅ |
| 0.5 premium-icons.tsx (6 illustrator) | patient-web/components/premium-icons.tsx | ✅ |
| 0.6 Vision V3 | Downloads/nabd-vision-v3.html | ✅ |

### المرحلة 1 — Shell + الهيرو + إصلاح الأخطاء الفادحة (8 شاشات)
| # | الشاشة | المسار | الإصلاح |
|---|---|---|---|
| 1.1 | Layout Shell (Header/Footer) | patient-web/app/[locale]/layout.tsx | إزالة BETA البني، توحيد Forest/Lime، إصلاح المسافات |
| 1.2 | Hero Home | patient-web/app/[locale]/page.tsx + home.module.css | خلفية Warm Cream بدلاً من Dark، نص غير مقطوع، Vector حقيقي |
| 1.3 | Breadcrumb | كل الصفحات | لا تقطيع، مسافة صحيحة |
| 1.4 | أكواد ظاهرة | كل الصفحات | إخفاء %8B%9A و BibTeX للمستخدم العادي |
| 1.5 | النصوص الملزقة | كل الصفحات | word-spacing، overflow-wrap |

### المرحلة 2 — الصيدلية (45 شاشة) — الأكبر
| # | الشاشة | المسار |
|---|---|---|
| 2.1 | كتالوج عام (ALL) | patient-web/app/[locale]/c/[[...category]]/page.tsx |
| 2.2 | تفاصيل دواء | patient-web/app/[locale]/medicines/[medicineId]/page.tsx |
| 2.3 | مقارنة أدوية | medicines/compare |
| 2.4 | سلة + دفع + تأكيد | pharmacy/* (8 صفحات) |
| 2.5 | البث والتتبع | pharmacy/broadcast-status, pharmacy/chat |

### المرحلة 3 — الأطباء والاستشارات (62 شاشة)
| # | الشاشة |
|---|---|
| 3.1 | بحث الأطباء (الصورة 3) |
| 3.2 | ملف الطبيب |
| 3.3 | حجز موعد + تأكيد |
| 3.4 | استشارات فيديو |

### المرحلة 4 — التشخيص (48 شاشة)
| # | الشاشة |
|---|---|
| 4.1 | مختبر (labs) |
| 4.2 | أشعة (radiology) |
| 4.3 | تمريض منزلي |

### المرحلة 5 — النظام (62 شاشة)
| # | الشاشة |
|---|---|
| 5.1 | إعدادات (8 صفحات) |
| 5.2 | عائلة |
| 5.3 | حمل وتغذية وصحة نفسية |
| 5.4 | أدمن (20) + مزود (26) |

## قاعدة التحقق لكل شاشة
1. افتح `page.tsx` → انسخ كل `fetch`/`apiFetch` → تأكد من `backend/src/modules/*` المسار موجود
2. إن وجد `MOCK`/`placeholder` → احذفه واربطه
3. إن وجد زر `onClick={}` فارغ → اربطه
4. إن وجد نص مقطوع (`...25` أو `.../`) → أصلح `line-clamp` و `overflow-wrap`
5. إن وجد كود ظاهر (`%8B`) → أخفه أو sanitize
6. طبّق Tokens V3 (Fair Mint/Lime/Forest/Cream) + Vector + 8pt

## التقدم
- [x] Foundation
- [ ] Phase 1 (8)
- [ ] Phase 2 (45)
- [ ] Phase 3 (62)
- [ ] Phase 4 (48)
- [ ] Phase 5 (62)
